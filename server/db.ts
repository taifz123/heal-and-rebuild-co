import { eq, and, gte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  users, 
  membershipTiers, 
  memberships, 
  serviceTypes, 
  bookings, 
  giftVouchers, 
  emailNotifications,
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
  type InsertEmailNotification
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

// ─── Memberships ──────────────────────────────────────────────────────────────

export async function getUserMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(memberships).where(eq(memberships.userId, userId)).orderBy(desc(memberships.createdAt));
}

export async function getActiveMembership(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const now = new Date();
  const result = await db.select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        gte(memberships.endDate, now)
      )
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

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getUserBookings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.bookingDate));
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

export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bookings).values(booking);
  return result;
}

export async function updateBooking(id: number, updates: Partial<Booking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(bookings).set(updates).where(eq(bookings.id, id));
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
  
  return await db.select().from(emailNotifications).where(eq(emailNotifications.userId, userId)).orderBy(desc(emailNotifications.createdAt));
}

// ─── Admin Queries ────────────────────────────────────────────────────────────

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getAllMemberships() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(memberships).orderBy(desc(memberships.createdAt));
}
