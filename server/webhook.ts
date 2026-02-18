import { Router } from 'express';
import { stripe } from './stripe';
import * as db from './db';
import { nanoid } from 'nanoid';

const router = Router();

// CRITICAL: Must use raw body for webhook signature verification
router.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Webhook] No signature provided');
    return res.status(400).send('No signature');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // CRITICAL: Handle test events
  if (event.id.startsWith('evt_test_')) {
    console.log('[Webhook] Test event detected, returning verification response');
    return res.json({ 
      verified: true,
    });
  }

  console.log('[Webhook] Processing event:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const metadata = session.metadata;

        if (!metadata || !metadata.user_id) {
          console.warn('[Webhook] Missing user_id in metadata');
          break;
        }

        const userId = parseInt(metadata.user_id);
        const purchaseType = metadata.purchase_type;

        if (purchaseType === 'membership') {
          // Create membership record
          const tierId = parseInt(metadata.tier_id);
          const tier = await db.getMembershipTierById(tierId);
          
          if (tier) {
            const startDate = new Date();
            let endDate = new Date();
            
            // Calculate end date based on duration
            switch (tier.duration) {
              case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1);
                break;
              case 'quarterly':
                endDate.setMonth(endDate.getMonth() + 3);
                break;
              case 'annual':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            }

            await db.createMembership({
              userId,
              tierId,
              status: 'active',
              startDate,
              endDate,
              sessionsUsed: 0,
              stripeSubscriptionId: session.subscription || null,
              stripeCustomerId: session.customer || null,
            });

            console.log('[Webhook] Membership created for user', userId);
          }
        } else if (purchaseType === 'gift_voucher') {
          // Create gift voucher
          const amount = metadata.voucher_amount;
          const code = `HEAL-${nanoid(10).toUpperCase()}`;
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity

          await db.createGiftVoucher({
            code,
            amount,
            purchasedBy: userId,
            status: 'active',
            expiryDate,
            stripePaymentIntentId: session.payment_intent as string || null,
          });

          console.log('[Webhook] Gift voucher created:', code);
        } else if (purchaseType === 'booking') {
          // Update booking with payment info
          const bookingId = parseInt(metadata.booking_id);
          await db.updateBooking(bookingId, {
            status: 'confirmed',
            stripePaymentIntentId: session.payment_intent as string || null,
          });

          console.log('[Webhook] Booking confirmed:', bookingId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('[Webhook] Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.error('[Webhook] Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
