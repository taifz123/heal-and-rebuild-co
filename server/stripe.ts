import Stripe from "stripe";
import type { User, MembershipTier } from "../drizzle/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY is not set — Stripe features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : (null as unknown as Stripe);

function getStripe(): Stripe {
  if (!stripe) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  return stripe;
}

// ─── Subscription Checkout ────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session in **subscription** mode.
 * Uses the tier's `stripePriceId` if set, otherwise creates an inline price.
 */
export async function createStripeSubscriptionSession(user: User, tier: MembershipTier) {
  const s = getStripe();

  const origin = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = tier.stripePriceId
    ? { price: tier.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: "aud",
          product_data: {
            name: `${tier.name} Membership`,
            description: `${tier.duration} subscription — ${tier.sessionsPerWeek} sessions/week`,
          },
          unit_amount: Math.round(parseFloat(tier.price) * 100),
          recurring: {
            interval: durationToInterval(tier.duration),
            interval_count: durationToIntervalCount(tier.duration),
          },
        },
        quantity: 1,
      };

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email || undefined,
    client_reference_id: user.id.toString(),
    metadata: {
      user_id: user.id.toString(),
      tier_id: tier.id.toString(),
      purchase_type: "subscription",
    },
    line_items: [lineItem],
    success_url: `${origin}/dashboard?payment=success&type=subscription`,
    cancel_url: `${origin}/memberships?payment=cancelled`,
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe Checkout session for one-time membership purchase (legacy).
 */
export async function createStripeCheckoutSession(user: User, tier: MembershipTier) {
  return createMembershipCheckout({
    userId: user.id,
    userEmail: user.email || "",
    userName: user.name,
    tierId: tier.id,
    tierName: tier.name,
    tierPrice: tier.price,
    tierDuration: tier.duration,
    origin: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  });
}

// ─── One-Time Checkout Sessions ───────────────────────────────────────────────

export async function createMembershipCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  tierId: number;
  tierName: string;
  tierPrice: string;
  tierDuration: string;
  origin: string;
}) {
  const s = getStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      tier_id: params.tierId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || "",
      purchase_type: "membership",
    },
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: `${params.tierName} Membership`,
            description: `${params.tierDuration} access to Heal & Rebuild Co`,
          },
          unit_amount: Math.round(parseFloat(params.tierPrice) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/dashboard?payment=success`,
    cancel_url: `${params.origin}/memberships?payment=cancelled`,
    allow_promotion_codes: true,
  });
  return session;
}

export async function createGiftVoucherCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  amount: string;
  origin: string;
}) {
  const s = getStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || "",
      purchase_type: "gift_voucher",
      voucher_amount: params.amount,
    },
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: "Wellness Gift Voucher",
            description: "Redeemable for any service at Heal & Rebuild Co",
          },
          unit_amount: Math.round(parseFloat(params.amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/dashboard?payment=success&type=voucher`,
    cancel_url: `${params.origin}/gift-vouchers?payment=cancelled`,
    allow_promotion_codes: true,
  });
  return session;
}

export async function createBookingCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  bookingId: number;
  serviceName: string;
  servicePrice: string;
  origin: string;
}) {
  const s = getStripe();
  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      booking_id: params.bookingId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || "",
      purchase_type: "booking",
    },
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: params.serviceName,
            description: "Wellness service booking",
          },
          unit_amount: Math.round(parseFloat(params.servicePrice) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${params.origin}/dashboard?payment=success&type=booking`,
    cancel_url: `${params.origin}/book?payment=cancelled`,
    allow_promotion_codes: true,
  });
  return session;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durationToInterval(duration: string): "week" | "month" | "year" {
  switch (duration) {
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "quarterly":
      return "month";
    case "annual":
      return "year";
    default:
      return "month";
  }
}

function durationToIntervalCount(duration: string): number {
  switch (duration) {
    case "weekly":
      return 1;
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "annual":
      return 1;
    default:
      return 1;
  }
}
