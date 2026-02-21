import { eq, and, gte, lte, desc, sql, ne, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  membershipTiers,
  memberships,
  serviceTypes,
  bookings,
  giftVouchers,
  emailNotifications,
  sessionSlots,
  weeklyUsage,
  adminOverrides,
  webhookEvents,
  paymentTransactions,
  subscriptions,
  authAccounts,
  emailOtps,
  auditLogs,
  type InsertUser,
  type MembershipTier,
  type Membership,
  type ServiceType,
  type Booking,
  type GiftVoucher,
  type InsertMembershipTier,
  type InsertMembership,
  type InsertServiceType,
  type InsertBooking,
  type InsertGiftVoucher,
  type InsertEmailNotification,
  type InsertSessionSlot,
  type InsertWeeklyUsage,
  type InsertAdminOverride,
  type InsertWebhookEvent,
  type InsertPaymentTransaction,
  type InsertSubscription,
  type InsertAuthAccount,
  type InsertEmailOtp,
  type InsertAuditLog,
  type SessionSlot,
  type Subscription,
  type WeeklyUsage,
  type AdminOverride,
  type WebhookEvent,
  type PaymentTransaction,
  type AuthAccount,
  type EmailOtp,
  type AuditLog,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Get the raw drizzle instance for transactions */
export async function getRawDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getUserById(Number(insertId));
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function searchUsers(query: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(users)
    .where(or(like(users.email, `%${query}%`), like(users.name, `%${query}%`)))
    .orderBy(desc(users.createdAt));
}

// ─── Membership Tiers ─────────────────────────────────────────────────────────

export async function getAllMembershipTiers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(membershipTiers).where(eq(membershipTiers.isActive, true));
}

export async function getMembershipTierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMembershipTier(tier: InsertMembershipTier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(membershipTiers).values(tier);
  return result;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
}

export async function getSubscriptionByProviderId(providerSubId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, providerSubId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscription(sub: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(sub);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function updateSubscription(id: number, updates: Partial<Subscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id));
}

export async function updateSubscriptionByProviderId(
  providerSubId: string,
  updates: Partial<Subscription>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.providerSubscriptionId, providerSubId));
}

export async function getAllActiveSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
}

export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

// ─── Memberships (legacy) ─────────────────────────────────────────────────────

export async function getUserMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.createdAt));
}

export async function getActiveMembership(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.userId, userId), eq(memberships.status, "active"), gte(memberships.endDate, now))
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMembership(membership: InsertMembership) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(memberships).values(membership);
  return result;
}

export async function updateMembership(id: number, updates: Partial<Membership>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(memberships).set(updates).where(eq(memberships.id, id));
}

export async function getAllMemberships() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(memberships).orderBy(desc(memberships.createdAt));
}

// ─── Service Types ────────────────────────────────────────────────────────────

export async function getAllServiceTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(serviceTypes).where(eq(serviceTypes.isActive, true));
}

export async function getServiceTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createServiceType(service: InsertServiceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceTypes).values(service);
  return result;
}

// ─── Session Slots ────────────────────────────────────────────────────────────

export async function getAvailableSessionSlots(from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sessionSlots)
    .where(
      and(
        eq(sessionSlots.isActive, true),
        gte(sessionSlots.startsAtUtc, from),
        lte(sessionSlots.startsAtUtc, to),
        sql`${sessionSlots.bookedCount} < ${sessionSlots.capacity}`
      )
    )
    .orderBy(sessionSlots.startsAtUtc);
}

export async function getAllSessionSlots(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sessionSlots.isActive, true)];
  if (from) conditions.push(gte(sessionSlots.startsAtUtc, from));
  if (to) conditions.push(lte(sessionSlots.startsAtUtc, to));
  return await db
    .select()
    .from(sessionSlots)
    .where(and(...conditions))
    .orderBy(sessionSlots.startsAtUtc);
}

export async function getSessionSlotById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessionSlots).where(eq(sessionSlots.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSessionSlot(slot: InsertSessionSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sessionSlots).values(slot);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function updateSessionSlot(id: number, updates: Partial<SessionSlot>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sessionSlots).set(updates).where(eq(sessionSlots.id, id));
}

export async function incrementSlotBookedCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sessionSlots)
    .set({ bookedCount: sql`${sessionSlots.bookedCount} + 1` })
    .where(eq(sessionSlots.id, id));
}

export async function decrementSlotBookedCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sessionSlots)
    .set({ bookedCount: sql`GREATEST(${sessionSlots.bookedCount} - 1, 0)` })
    .where(eq(sessionSlots.id, id));
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getUserBookings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.bookingDate));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings).orderBy(desc(bookings.bookingDate));
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveBookingForSlot(userId: number, sessionSlotId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.userId, userId),
        eq(bookings.sessionSlotId, sessionSlotId),
        ne(bookings.status, "cancelled")
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(booking);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function updateBooking(id: number, updates: Partial<Booking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookings).set(updates).where(eq(bookings.id, id));
}

// ─── Weekly Usage ─────────────────────────────────────────────────────────────

export async function getWeeklyUsage(userId: number, weekStartDate: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(weeklyUsage)
    .where(and(eq(weeklyUsage.userId, userId), eq(weeklyUsage.weekStartDate, weekStartDate)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertWeeklyUsage(userId: number, weekStartDate: string, limitSnapshot: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getWeeklyUsage(userId, weekStartDate);
  if (existing) return existing;
  await db.insert(weeklyUsage).values({
    userId,
    weekStartDate,
    sessionsUsed: 0,
    sessionsLimitSnapshot: limitSnapshot,
  });
  return await getWeeklyUsage(userId, weekStartDate);
}

export async function incrementWeeklyUsage(userId: number, weekStartDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(weeklyUsage)
    .set({ sessionsUsed: sql`${weeklyUsage.sessionsUsed} + 1` })
    .where(and(eq(weeklyUsage.userId, userId), eq(weeklyUsage.weekStartDate, weekStartDate)));
}

export async function decrementWeeklyUsage(userId: number, weekStartDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(weeklyUsage)
    .set({ sessionsUsed: sql`GREATEST(${weeklyUsage.sessionsUsed} - 1, 0)` })
    .where(and(eq(weeklyUsage.userId, userId), eq(weeklyUsage.weekStartDate, weekStartDate)));
}

export async function adjustWeeklyUsage(userId: number, weekStartDate: string, delta: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (delta > 0) {
    await db
      .update(weeklyUsage)
      .set({ sessionsLimitSnapshot: sql`${weeklyUsage.sessionsLimitSnapshot} + ${delta}` })
      .where(and(eq(weeklyUsage.userId, userId), eq(weeklyUsage.weekStartDate, weekStartDate)));
  } else {
    await db
      .update(weeklyUsage)
      .set({
        sessionsLimitSnapshot: sql`GREATEST(${weeklyUsage.sessionsLimitSnapshot} + ${delta}, 0)`,
      })
      .where(and(eq(weeklyUsage.userId, userId), eq(weeklyUsage.weekStartDate, weekStartDate)));
  }
}

export async function getAllWeeklyUsageForWeek(weekStartDate: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(weeklyUsage)
    .where(eq(weeklyUsage.weekStartDate, weekStartDate));
}

export async function getUserWeeklyUsageHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(weeklyUsage)
    .where(eq(weeklyUsage.userId, userId))
    .orderBy(desc(weeklyUsage.weekStartDate))
    .limit(12);
}

// ─── Admin Overrides ──────────────────────────────────────────────────────────

export async function createAdminOverride(override: InsertAdminOverride) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(adminOverrides).values(override);
  return result;
}

export async function getAdminOverridesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(adminOverrides)
    .where(eq(adminOverrides.userId, userId))
    .orderBy(desc(adminOverrides.createdAt));
}

export async function getAllAdminOverrides() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(adminOverrides).orderBy(desc(adminOverrides.createdAt)).limit(100);
}

// ─── Webhook Events ───────────────────────────────────────────────────────────

export async function getWebhookEvent(provider: string, eventId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWebhookEvent(event: InsertWebhookEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(webhookEvents).values(event);
    return true;
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") return false;
    throw err;
  }
}

export async function updateWebhookEvent(
  provider: string,
  eventId: string,
  updates: Partial<WebhookEvent>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(webhookEvents)
    .set(updates)
    .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
}

// ─── Payment Transactions ─────────────────────────────────────────────────────

export async function createPaymentTransaction(tx: InsertPaymentTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentTransactions).values(tx);
  return result;
}

export async function getPaymentTransactions(filters?: { userId?: number; from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(paymentTransactions.userId, filters.userId));
  if (filters?.from) conditions.push(gte(paymentTransactions.createdAt, filters.from));
  if (filters?.to) conditions.push(lte(paymentTransactions.createdAt, filters.to));
  return await db
    .select()
    .from(paymentTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paymentTransactions.createdAt));
}

export async function getRevenueSummary(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db)
    return {
      totalRevenue: "0",
      transactionCount: 0,
      activeSubscriptions: 0,
      failedPayments: 0,
    };

  const conditions: any[] = [eq(paymentTransactions.status, "succeeded")];
  if (from) conditions.push(gte(paymentTransactions.createdAt, from));
  if (to) conditions.push(lte(paymentTransactions.createdAt, to));

  const revenueResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${paymentTransactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(paymentTransactions)
    .where(and(...conditions));

  const failedConditions: any[] = [eq(paymentTransactions.status, "failed")];
  if (from) failedConditions.push(gte(paymentTransactions.createdAt, from));
  if (to) failedConditions.push(lte(paymentTransactions.createdAt, to));

  const failedResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(paymentTransactions)
    .where(and(...failedConditions));

  const activeSubResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return {
    totalRevenue: revenueResult[0]?.total ?? "0",
    transactionCount: revenueResult[0]?.count ?? 0,
    activeSubscriptions: activeSubResult[0]?.count ?? 0,
    failedPayments: failedResult[0]?.count ?? 0,
  };
}

// ─── Gift Vouchers ────────────────────────────────────────────────────────────

export async function getGiftVoucherByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(giftVouchers).where(eq(giftVouchers.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGiftVoucher(voucher: InsertGiftVoucher) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(giftVouchers).values(voucher);
  return result;
}

export async function updateGiftVoucher(id: number, updates: Partial<GiftVoucher>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(giftVouchers).set(updates).where(eq(giftVouchers.id, id));
}

// ─── Email Notifications ──────────────────────────────────────────────────────

export async function createEmailNotification(notification: InsertEmailNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailNotifications).values(notification);
  return result;
}

export async function getUserEmailNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(emailNotifications)
    .where(eq(emailNotifications.userId, userId))
    .orderBy(desc(emailNotifications.createdAt));
}

// ─── Auth Accounts ───────────────────────────────────────────────────────────

export async function getAuthAccount(provider: string, providerUserId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, provider),
        eq(authAccounts.providerUserId, providerUserId)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAuthAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(authAccounts)
    .where(eq(authAccounts.userId, userId));
}

export async function createAuthAccount(account: InsertAuthAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(authAccounts).values(account);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

// ─── Email OTPs ──────────────────────────────────────────────────────────────

export async function createEmailOtp(otp: InsertEmailOtp) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailOtps).values(otp);
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function getLatestEmailOtp(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(emailOtps)
    .where(
      and(
        eq(emailOtps.email, email),
        eq(emailOtps.used, false),
        gte(emailOtps.expiresAt, new Date())
      )
    )
    .orderBy(desc(emailOtps.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markOtpUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailOtps).set({ used: true }).where(eq(emailOtps.id, id));
}

export async function incrementOtpAttempts(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(emailOtps)
    .set({ attempts: sql`${emailOtps.attempts} + 1` })
    .where(eq(emailOtps.id, id));
}

export async function invalidateOtpsForEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(emailOtps)
    .set({ used: true })
    .where(and(eq(emailOtps.email, email), eq(emailOtps.used, false)));
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return; // Audit logging is best-effort
  try {
    await db.insert(auditLogs).values(log);
  } catch (err) {
    console.error("[AuditLog] Failed to write:", err);
  }
}

export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  entityType?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  return await db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters?.limit ?? 100);
}

// ─── User Status ─────────────────────────────────────────────────────────────

export async function updateUserStatus(id: number, status: "active" | "suspended") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ status }).where(eq(users.id, id));
}

export async function getUserStatus(id: number): Promise<string | undefined> {
  const user = await getUserById(id);
  return user?.status;
}
