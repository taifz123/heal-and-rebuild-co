import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

/**
 * Create a Stripe checkout session for membership purchase
 */
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
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      tier_id: params.tierId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || '',
      purchase_type: 'membership',
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
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

/**
 * Create a Stripe checkout session for gift voucher purchase
 */
export async function createGiftVoucherCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  amount: string;
  origin: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || '',
      purchase_type: 'gift_voucher',
      voucher_amount: params.amount,
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Wellness Gift Voucher',
            description: 'Redeemable for any service at Heal & Rebuild Co',
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

/**
 * Create a Stripe checkout session for booking payment
 */
export async function createBookingCheckout(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  bookingId: number;
  serviceName: string;
  servicePrice: string;
  origin: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      booking_id: params.bookingId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName || '',
      purchase_type: 'booking',
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: params.serviceName,
            description: 'Wellness service booking',
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
