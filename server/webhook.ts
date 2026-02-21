import { Router } from "express";
import { stripe } from "./stripe";
import * as db from "./db";
import { nanoid } from "nanoid";

const router = Router();

/**
 * Stripe Webhook Handler
 *
 * Handles the full subscription lifecycle with idempotency:
 * - checkout.session.completed  → create subscription / membership / voucher / booking
 * - invoice.paid                → renew subscription period
 * - invoice.payment_failed      → mark subscription past_due
 * - customer.subscription.updated → sync status changes
 * - customer.subscription.deleted → cancel subscription
 * - payment_intent.succeeded    → log transaction
 * - payment_intent.payment_failed → log failed transaction
 *
 * Idempotency: Each event is recorded in webhook_events table.
 * Duplicate events are silently ignored.
 */
router.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Webhook] No signature provided");
    return res.status(400).send("No signature");
  }

  if (!stripe) {
    console.error("[Webhook] Stripe not configured");
    return res.status(500).send("Stripe not configured");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log("[Webhook] Processing event:", event.type, event.id);

  // ── Idempotency check ──────────────────────────────────────────────────
  const isNew = await db.createWebhookEvent({
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    status: "processing",
    payload: JSON.stringify(event.data.object),
  });

  if (!isNew) {
    console.log("[Webhook] Duplicate event, skipping:", event.id);
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      // ── Checkout completed ───────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const metadata = session.metadata;

        if (!metadata || !metadata.user_id) {
          console.warn("[Webhook] Missing user_id in metadata");
          break;
        }

        const userId = parseInt(metadata.user_id);
        const purchaseType = metadata.purchase_type;

        if (purchaseType === "subscription") {
          // ── Create subscription record ────────────────────────────
          const tierId = parseInt(metadata.tier_id);
          const stripeSubId = session.subscription as string;
          const stripeCustomerId = session.customer as string;

          // Cancel any existing active subscription for this user
          const existingSub = await db.getActiveSubscription(userId);
          if (existingSub) {
            await db.updateSubscription(existingSub.id, {
              status: "cancelled",
              cancelledAt: new Date(),
            });
          }

          await db.createSubscription({
            userId,
            tierId,
            paymentProvider: "stripe",
            providerSubscriptionId: stripeSubId,
            providerCustomerId: stripeCustomerId,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: null, // Will be set by invoice.paid
          });

          // Log payment transaction
          await db.createPaymentTransaction({
            userId,
            provider: "stripe",
            providerTransactionId: session.payment_intent || stripeSubId,
            amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0",
            currency: session.currency || "aud",
            type: "subscription",
            status: "succeeded",
            metadata: JSON.stringify({ tierId, stripeSubId }),
          });

          console.log("[Webhook] Subscription created for user", userId, "tier", tierId);
        } else if (purchaseType === "membership") {
          // ── One-time membership purchase ──────────────────────────
          const tierId = parseInt(metadata.tier_id);
          const tier = await db.getMembershipTierById(tierId);

          if (tier) {
            const startDate = new Date();
            const endDate = new Date();

            switch (tier.duration) {
              case "weekly":
                endDate.setDate(endDate.getDate() + 7);
                break;
              case "monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
              case "quarterly":
                endDate.setMonth(endDate.getMonth() + 3);
                break;
              case "annual":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            }

            await db.createMembership({
              userId,
              tierId,
              status: "active",
              startDate,
              endDate,
              sessionsUsed: 0,
              stripeSubscriptionId: session.subscription || null,
              stripeCustomerId: session.customer || null,
            });

            await db.createPaymentTransaction({
              userId,
              provider: "stripe",
              providerTransactionId: session.payment_intent as string,
              amount: tier.price,
              currency: "aud",
              type: "membership",
              status: "succeeded",
              metadata: JSON.stringify({ tierId }),
            });

            console.log("[Webhook] Membership created for user", userId);
          }
        } else if (purchaseType === "gift_voucher") {
          const amount = metadata.voucher_amount;
          const code = `HEAL-${nanoid(10).toUpperCase()}`;
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);

          await db.createGiftVoucher({
            code,
            amount,
            purchasedBy: userId,
            status: "active",
            expiryDate,
            stripePaymentIntentId: (session.payment_intent as string) || null,
          });

          await db.createPaymentTransaction({
            userId,
            provider: "stripe",
            providerTransactionId: session.payment_intent as string,
            amount,
            currency: "aud",
            type: "gift_voucher",
            status: "succeeded",
          });

          console.log("[Webhook] Gift voucher created:", code);
        } else if (purchaseType === "booking") {
          const bookingId = parseInt(metadata.booking_id);
          await db.updateBooking(bookingId, {
            status: "confirmed",
            stripePaymentIntentId: (session.payment_intent as string) || null,
          });

          await db.createPaymentTransaction({
            userId,
            provider: "stripe",
            providerTransactionId: session.payment_intent as string,
            amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0",
            currency: session.currency || "aud",
            type: "booking",
            status: "succeeded",
            metadata: JSON.stringify({ bookingId }),
          });

          console.log("[Webhook] Booking confirmed:", bookingId);
        }
        break;
      }

      // ── Invoice paid (subscription renewal) ──────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription as string;

        if (stripeSubId) {
          const sub = await db.getSubscriptionByProviderId(stripeSubId);
          if (sub) {
            await db.updateSubscription(sub.id, {
              status: "active",
              currentPeriodStart: invoice.period_start
                ? new Date(invoice.period_start * 1000)
                : new Date(),
              currentPeriodEnd: invoice.period_end
                ? new Date(invoice.period_end * 1000)
                : null,
            });

            await db.createPaymentTransaction({
              userId: sub.userId,
              provider: "stripe",
              providerTransactionId: invoice.payment_intent as string,
              amount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : "0",
              currency: invoice.currency || "aud",
              type: "subscription",
              status: "succeeded",
              metadata: JSON.stringify({ subscriptionId: sub.id, invoiceId: invoice.id }),
            });

            console.log("[Webhook] Subscription renewed for user", sub.userId);
          }
        }
        break;
      }

      // ── Invoice payment failed ───────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const stripeSubId = invoice.subscription as string;

        if (stripeSubId) {
          const sub = await db.getSubscriptionByProviderId(stripeSubId);
          if (sub) {
            await db.updateSubscription(sub.id, { status: "past_due" });

            await db.createPaymentTransaction({
              userId: sub.userId,
              provider: "stripe",
              providerTransactionId: invoice.payment_intent as string,
              amount: invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0",
              currency: invoice.currency || "aud",
              type: "subscription",
              status: "failed",
              metadata: JSON.stringify({ subscriptionId: sub.id, invoiceId: invoice.id }),
            });

            console.log("[Webhook] Payment failed for subscription", sub.id, "user", sub.userId);
          }
        }
        break;
      }

      // ── Subscription updated (plan change, etc.) ─────────────────────
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as any;
        const stripeSubId = stripeSub.id as string;
        const sub = await db.getSubscriptionByProviderId(stripeSubId);

        if (sub) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            unpaid: "unpaid",
            canceled: "cancelled",
            incomplete: "pending",
            incomplete_expired: "cancelled",
            trialing: "active",
            paused: "suspended",
          };

          const newStatus = statusMap[stripeSub.status] || sub.status;

          await db.updateSubscription(sub.id, {
            status: newStatus as any,
            currentPeriodStart: stripeSub.current_period_start
              ? new Date(stripeSub.current_period_start * 1000)
              : sub.currentPeriodStart,
            currentPeriodEnd: stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000)
              : sub.currentPeriodEnd,
          });

          console.log("[Webhook] Subscription updated:", sub.id, "→", newStatus);
        }
        break;
      }

      // ── Subscription deleted (cancelled) ─────────────────────────────
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as any;
        const stripeSubId = stripeSub.id as string;
        const sub = await db.getSubscriptionByProviderId(stripeSubId);

        if (sub) {
          await db.updateSubscription(sub.id, {
            status: "cancelled",
            cancelledAt: new Date(),
          });
          console.log("[Webhook] Subscription cancelled:", sub.id, "user", sub.userId);
        }
        break;
      }

      // ── Payment intent succeeded ─────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as any;
        console.log("[Webhook] Payment succeeded:", pi.id);
        break;
      }

      // ── Payment intent failed ────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as any;
        console.error("[Webhook] Payment failed:", pi.id);
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    // Mark event as processed
    await db.updateWebhookEvent("stripe", event.id, {
      status: "processed",
      processedAt: new Date(),
    });

    res.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing event:", error);

    // Mark event as failed
    await db.updateWebhookEvent("stripe", event.id, { status: "failed" });

    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
