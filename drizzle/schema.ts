import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  uniqueIndex,
  date,
} from "drizzle-orm/mysql-core";

/* ═══════════════════════════════════════════════════════════════════════════
   GYM TIMEZONE CONSTANT
   All weekly-reset logic and slot rendering uses this timezone.
   ═══════════════════════════════════════════════════════════════════════════ */
export const GYM_TIMEZONE = "Australia/Sydney";

/* ═══════════════════════════════════════════════════════════════════════════
   1. USERS
   ═══════════════════════════════════════════════════════════════════════════ */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   2. MEMBERSHIP TIERS
   ═══════════════════════════════════════════════════════════════════════════ */
export const membershipTiers = mysqlTable("membership_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  duration: mysqlEnum("duration", ["weekly", "monthly", "quarterly", "annual"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sessionsPerWeek: int("sessions_per_week").notNull().default(0),
  features: text("features"),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = typeof membershipTiers.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   3. SUBSCRIPTIONS  (replaces old memberships for recurring billing)
   ═══════════════════════════════════════════════════════════════════════════ */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tierId: int("tier_id").notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }).default("stripe").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
  providerCustomerId: varchar("provider_customer_id", { length: 255 }),
  status: mysqlEnum("status", [
    "active",
    "past_due",
    "unpaid",
    "cancelled",
    "suspended",
    "pending",
  ])
    .default("pending")
    .notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  suspendedAt: timestamp("suspended_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   4. MEMBERSHIPS  (legacy table kept for backward compat / one-time purchases)
   ═══════════════════════════════════════════════════════════════════════════ */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tierId: int("tier_id").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"])
    .default("pending")
    .notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  sessionsUsed: int("sessions_used").default(0).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   5. SERVICE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
export const serviceTypes = mysqlTable("service_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  duration: int("duration").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = typeof serviceTypes.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   6. SESSION SLOTS  (concrete time-boxed classes / sessions)
   ═══════════════════════════════════════════════════════════════════════════ */
export const sessionSlots = mysqlTable("session_slots", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("service_type_id"),
  name: varchar("name", { length: 200 }).notNull(),
  startsAtUtc: timestamp("starts_at_utc").notNull(),
  endsAtUtc: timestamp("ends_at_utc").notNull(),
  capacity: int("capacity").notNull().default(10),
  bookedCount: int("booked_count").notNull().default(0),
  trainerName: varchar("trainer_name", { length: 200 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SessionSlot = typeof sessionSlots.$inferSelect;
export type InsertSessionSlot = typeof sessionSlots.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   7. BOOKINGS  (links user → session slot)
   ═══════════════════════════════════════════════════════════════════════════ */
export const bookings = mysqlTable(
  "bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    sessionSlotId: int("session_slot_id"),
    serviceTypeId: int("service_type_id").notNull(),
    bookingDate: timestamp("booking_date").notNull(),
    status: mysqlEnum("status", [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
      "no_show",
    ])
      .default("pending")
      .notNull(),
    notes: text("notes"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_user_slot_active").on(table.userId, table.sessionSlotId),
  ]
);

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   8. WEEKLY USAGE  (per-user per-week quota tracking)
   ═══════════════════════════════════════════════════════════════════════════ */
export const weeklyUsage = mysqlTable(
  "weekly_usage",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    weekStartDate: date("week_start_date").notNull(),
    sessionsUsed: int("sessions_used").notNull().default(0),
    sessionsLimitSnapshot: int("sessions_limit_snapshot"),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_user_week").on(table.userId, table.weekStartDate),
  ]
);

export type WeeklyUsage = typeof weeklyUsage.$inferSelect;
export type InsertWeeklyUsage = typeof weeklyUsage.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   9. ADMIN OVERRIDES  (audit trail for manual admin actions)
   ═══════════════════════════════════════════════════════════════════════════ */
export const adminOverrides = mysqlTable("admin_overrides", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  adminUserId: int("admin_user_id").notNull(),
  changeType: mysqlEnum("change_type", [
    "add_sessions",
    "remove_sessions",
    "suspend",
    "reactivate",
  ]).notNull(),
  sessionDelta: int("session_delta"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminOverride = typeof adminOverrides.$inferSelect;
export type InsertAdminOverride = typeof adminOverrides.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   10. WEBHOOK EVENTS  (idempotency tracking)
   ═══════════════════════════════════════════════════════════════════════════ */
export const webhookEvents = mysqlTable(
  "webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 50 }).notNull(),
    eventId: varchar("event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: mysqlEnum("status", ["processing", "processed", "failed"])
      .default("processing")
      .notNull(),
    processedAt: timestamp("processed_at"),
    payload: text("payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_provider_event").on(table.provider, table.eventId),
  ]
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   11. PAYMENT TRANSACTIONS  (normalized payment log)
   ═══════════════════════════════════════════════════════════════════════════ */
export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  provider: varchar("provider", { length: 50 }).default("stripe").notNull(),
  providerTransactionId: varchar("provider_transaction_id", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  type: mysqlEnum("type", [
    "membership",
    "booking",
    "gift_voucher",
    "subscription",
    "refund",
  ]).notNull(),
  status: mysqlEnum("status", ["succeeded", "failed", "pending", "refunded"])
    .default("pending")
    .notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   12. GIFT VOUCHERS
   ═══════════════════════════════════════════════════════════════════════════ */
export const giftVouchers = mysqlTable("gift_vouchers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  purchasedBy: int("purchased_by"),
  redeemedBy: int("redeemed_by"),
  status: mysqlEnum("status", ["active", "redeemed", "expired"])
    .default("active")
    .notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GiftVoucher = typeof giftVouchers.$inferSelect;
export type InsertGiftVoucher = typeof giftVouchers.$inferInsert;

/* ═══════════════════════════════════════════════════════════════════════════
   13. EMAIL NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */
export const emailNotifications = mysqlTable("email_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", [
    "booking_confirmation",
    "membership_renewal",
    "appointment_reminder",
    "promotional",
  ]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"])
    .default("pending")
    .notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
