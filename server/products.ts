/**
 * Stripe Products and Prices Configuration
 * Define products and prices for centralized access
 */

export const PRODUCTS = {
  // Membership tiers will be dynamically created from database
  // Gift vouchers
  GIFT_VOUCHER: {
    name: "Gift Voucher",
    description: "Wellness gift voucher redeemable for services",
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
