import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Uses email/password authentication (bcrypt hashed passwords).
 */
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

/**
 * Membership tiers (monthly, quarterly, annual)
 */
export const membershipTiers = mysqlTable("membership_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  duration: mysqlEnum("duration", ["monthly", "quarterly", "annual"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sessionsPerWeek: int("sessions_per_week").notNull().default(0),
  features: text("features"), // JSON string of features array
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = typeof membershipTiers.$inferInsert;

/**
 * User memberships
 */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tierId: int("tier_id").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
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

/**
 * Service types (gym session, therapy, wellness service)
 */
export const serviceTypes = mysqlTable("service_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  duration: int("duration").notNull(), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = typeof serviceTypes.$inferInsert;

/**
 * Bookings for gym sessions, therapy, wellness services
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  serviceTypeId: int("service_type_id").notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Gift vouchers
 */
export const giftVouchers = mysqlTable("gift_vouchers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  purchasedBy: int("purchased_by"),
  redeemedBy: int("redeemed_by"),
  status: mysqlEnum("status", ["active", "redeemed", "expired"]).default("active").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GiftVoucher = typeof giftVouchers.$inferSelect;
export type InsertGiftVoucher = typeof giftVouchers.$inferInsert;

/**
 * Email notifications log
 */
export const emailNotifications = mysqlTable("email_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: mysqlEnum("type", ["booking_confirmation", "membership_renewal", "appointment_reminder", "promotional"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
