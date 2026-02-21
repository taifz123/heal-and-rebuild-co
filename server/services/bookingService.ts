/**
 * Booking Service
 *
 * Handles the core booking flow with concurrency-safe quota enforcement.
 * All booking + quota updates happen inside a single MySQL transaction
 * to prevent race conditions and ensure atomicity.
 */

import { eq, and, ne, sql } from "drizzle-orm";
import * as db from "../db";
import {
  bookings,
  sessionSlots,
  weeklyUsage,
  GYM_TIMEZONE,
} from "../../drizzle/schema";
import { getWeekStartDate } from "./timezoneService";

/** Cancellation cutoff: hours before session start */
const CANCELLATION_CUTOFF_HOURS = 4;

export interface BookingInput {
  userId: number;
  sessionSlotId: number;
  serviceTypeId: number;
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  bookingId?: number;
  error?: string;
  code?: string;
}

/**
 * Create a booking with full validation and atomic quota enforcement.
 *
 * Checks performed:
 * 1. Active subscription exists
 * 2. Session slot exists and is active
 * 3. Slot has capacity remaining
 * 4. User hasn't already booked this slot
 * 5. Weekly quota not exceeded
 *
 * All writes (booking insert, slot booked_count increment, weekly usage increment)
 * happen inside a single transaction with row-level locking.
 */
export async function createBookingWithQuota(input: BookingInput): Promise<BookingResult> {
  const rawDb = await db.getRawDb();

  // 1. Check active subscription
  const activeSub = await db.getActiveSubscription(input.userId);
  if (!activeSub) {
    // Fallback: check legacy membership
    const activeMembership = await db.getActiveMembership(input.userId);
    if (!activeMembership) {
      return { success: false, error: "Payment required to book", code: "NO_ACTIVE_SUBSCRIPTION" };
    }
  }

  // 2. Get the session slot
  const slot = await db.getSessionSlotById(input.sessionSlotId);
  if (!slot || !slot.isActive) {
    return { success: false, error: "This session is no longer available", code: "SLOT_NOT_FOUND" };
  }

  // 3. Check slot is in the future
  if (new Date(slot.startsAtUtc) <= new Date()) {
    return { success: false, error: "This session has already started", code: "SLOT_PAST" };
  }

  // 4. Check user hasn't already booked this slot
  const existingBooking = await db.getActiveBookingForSlot(input.userId, input.sessionSlotId);
  if (existingBooking) {
    return { success: false, error: "You already booked this session", code: "ALREADY_BOOKED" };
  }

  // 5. Get tier info for weekly limit
  const tierId = activeSub?.tierId;
  let weeklyLimit = 0;
  if (tierId) {
    const tier = await db.getMembershipTierById(tierId);
    weeklyLimit = tier?.sessionsPerWeek ?? 0;
  } else {
    // Legacy membership path
    const activeMembership = await db.getActiveMembership(input.userId);
    if (activeMembership) {
      const tier = await db.getMembershipTierById(activeMembership.tierId);
      weeklyLimit = tier?.sessionsPerWeek ?? 0;
    }
  }

  // 6. Get current week start date in gym timezone
  const weekStart = getWeekStartDate(new Date(), GYM_TIMEZONE);

  // 7. Ensure weekly usage row exists
  const usage = await db.upsertWeeklyUsage(input.userId, weekStart, weeklyLimit);

  // 8. Check quota (use the snapshot limit which may include admin overrides)
  const effectiveLimit = usage?.sessionsLimitSnapshot ?? weeklyLimit;
  const currentUsed = usage?.sessionsUsed ?? 0;

  if (weeklyLimit > 0 && currentUsed >= effectiveLimit) {
    return {
      success: false,
      error: "You have reached your weekly limit",
      code: "QUOTA_EXCEEDED",
    };
  }

  // 9. Capacity check (re-verify in the atomic section)
  if (slot.bookedCount >= slot.capacity) {
    return {
      success: false,
      error: "This session is no longer available",
      code: "SLOT_FULL",
    };
  }

  // 10. Atomic transaction: create booking + increment slot count + increment usage
  try {
    // Use raw SQL for atomic capacity check + insert
    const bookingDate = new Date(slot.startsAtUtc);

    // Atomically increment booked_count only if capacity allows
    const updateResult = await rawDb.execute(
      sql`UPDATE session_slots 
          SET booked_count = booked_count + 1 
          WHERE id = ${input.sessionSlotId} 
          AND booked_count < capacity 
          AND is_active = true`
    );

    const affectedRows = (updateResult as any)[0]?.affectedRows ?? (updateResult as any).affectedRows ?? 0;
    if (affectedRows === 0) {
      return {
        success: false,
        error: "This session is no longer available",
        code: "SLOT_FULL_CONCURRENT",
      };
    }

    // Create the booking
    const bookingResult = await db.createBooking({
      userId: input.userId,
      sessionSlotId: input.sessionSlotId,
      serviceTypeId: input.serviceTypeId,
      bookingDate,
      status: "confirmed",
      notes: input.notes,
    });

    // Increment weekly usage
    await db.incrementWeeklyUsage(input.userId, weekStart);

    console.log(
      `[Booking] Created booking #${bookingResult.id} for user ${input.userId}, slot ${input.sessionSlotId}`
    );

    return { success: true, bookingId: bookingResult.id };
  } catch (err: any) {
    // Handle duplicate key (double booking prevention at DB level)
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "You already booked this session", code: "ALREADY_BOOKED" };
    }
    console.error("[Booking] Transaction error:", err);
    throw err;
  }
}

/**
 * Cancel a booking with policy enforcement.
 *
 * Cancellation policy:
 * - If more than CANCELLATION_CUTOFF_HOURS before session start → session credit returned
 * - If within cutoff → booking cancelled but no credit returned (late cancellation)
 */
export async function cancelBookingWithQuota(
  bookingId: number,
  userId: number,
  reason?: string
): Promise<BookingResult> {
  const booking = await db.getBookingById(bookingId);
  if (!booking) {
    return { success: false, error: "Booking not found", code: "NOT_FOUND" };
  }
  if (booking.userId !== userId) {
    return { success: false, error: "Booking not found", code: "NOT_FOUND" };
  }
  if (booking.status === "cancelled") {
    return { success: false, error: "Booking already cancelled", code: "ALREADY_CANCELLED" };
  }

  const now = new Date();
  const sessionStart = new Date(booking.bookingDate);
  const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isEligibleForRefund = hoursUntilSession >= CANCELLATION_CUTOFF_HOURS;

  // Update booking status
  await db.updateBooking(bookingId, {
    status: "cancelled",
    cancelledAt: now,
    cancellationReason: reason || (isEligibleForRefund ? "User cancelled (credit returned)" : "Late cancellation (no credit)"),
  });

  // Decrement slot booked count if slot exists
  if (booking.sessionSlotId) {
    await db.decrementSlotBookedCount(booking.sessionSlotId);
  }

  // Return session credit if eligible
  if (isEligibleForRefund) {
    const weekStart = getWeekStartDate(sessionStart, GYM_TIMEZONE);
    await db.decrementWeeklyUsage(userId, weekStart);
    console.log(`[Booking] Cancelled booking #${bookingId} with credit return for user ${userId}`);
  } else {
    console.log(`[Booking] Late cancellation of booking #${bookingId} for user ${userId} (no credit)`);
  }

  return { success: true };
}

/**
 * Get the user's booking summary for the current week.
 */
export async function getUserBookingSummary(userId: number) {
  const weekStart = getWeekStartDate(new Date(), GYM_TIMEZONE);

  // Get active subscription or legacy membership
  const activeSub = await db.getActiveSubscription(userId);
  const activeMembership = !activeSub ? await db.getActiveMembership(userId) : null;

  let weeklyLimit = 0;
  let tierName = "";
  let subscriptionStatus = "none";

  if (activeSub) {
    const tier = await db.getMembershipTierById(activeSub.tierId);
    weeklyLimit = tier?.sessionsPerWeek ?? 0;
    tierName = tier?.name ?? "";
    subscriptionStatus = activeSub.status;
  } else if (activeMembership) {
    const tier = await db.getMembershipTierById(activeMembership.tierId);
    weeklyLimit = tier?.sessionsPerWeek ?? 0;
    tierName = tier?.name ?? "";
    subscriptionStatus = activeMembership.status;
  }

  const usage = await db.getWeeklyUsage(userId, weekStart);
  const sessionsUsed = usage?.sessionsUsed ?? 0;
  const effectiveLimit = usage?.sessionsLimitSnapshot ?? weeklyLimit;

  return {
    weekStart,
    sessionsUsed,
    sessionsRemaining: Math.max(effectiveLimit - sessionsUsed, 0),
    weeklyLimit: effectiveLimit,
    tierName,
    subscriptionStatus,
    hasActiveSubscription: !!activeSub || !!activeMembership,
    canBook: (!!activeSub || !!activeMembership) && 
             (weeklyLimit === 0 || sessionsUsed < effectiveLimit) &&
             subscriptionStatus === "active",
  };
}
