/**
 * Admin Service
 *
 * Handles admin-only operations: member management, quota overrides,
 * subscription suspension/reactivation, and dashboard statistics.
 */

import * as db from "../db";
import { GYM_TIMEZONE } from "../../drizzle/schema";
import { getWeekStartDate } from "./timezoneService";

export interface AdminOverrideInput {
  userId: number;
  adminUserId: number;
  changeType: "add_sessions" | "remove_sessions" | "suspend" | "reactivate";
  sessionDelta?: number;
  reason: string;
}

/**
 * Apply an admin override to a user's account.
 * Creates an audit trail and applies the change atomically.
 */
export async function applyAdminOverride(input: AdminOverrideInput) {
  const user = await db.getUserById(input.userId);
  if (!user) throw new Error("User not found");

  // Create the audit record
  await db.createAdminOverride({
    userId: input.userId,
    adminUserId: input.adminUserId,
    changeType: input.changeType,
    sessionDelta: input.sessionDelta ?? null,
    reason: input.reason,
  });

  const weekStart = getWeekStartDate(new Date(), GYM_TIMEZONE);

  switch (input.changeType) {
    case "add_sessions": {
      const delta = input.sessionDelta ?? 0;
      if (delta <= 0) throw new Error("Session delta must be positive for add_sessions");

      // Get or create weekly usage row, then adjust the limit snapshot
      const activeSub = await db.getActiveSubscription(input.userId);
      const activeMembership = !activeSub ? await db.getActiveMembership(input.userId) : null;
      let weeklyLimit = 0;
      if (activeSub) {
        const tier = await db.getMembershipTierById(activeSub.tierId);
        weeklyLimit = tier?.sessionsPerWeek ?? 0;
      } else if (activeMembership) {
        const tier = await db.getMembershipTierById(activeMembership.tierId);
        weeklyLimit = tier?.sessionsPerWeek ?? 0;
      }

      await db.upsertWeeklyUsage(input.userId, weekStart, weeklyLimit);
      await db.adjustWeeklyUsage(input.userId, weekStart, delta);

      console.log(`[Admin] Added ${delta} sessions for user ${input.userId} (week ${weekStart})`);
      return { message: `Added ${delta} bonus sessions for this week` };
    }

    case "remove_sessions": {
      const delta = Math.abs(input.sessionDelta ?? 0);
      if (delta <= 0) throw new Error("Session delta must be positive for remove_sessions");

      await db.adjustWeeklyUsage(input.userId, weekStart, -delta);

      console.log(`[Admin] Removed ${delta} sessions for user ${input.userId} (week ${weekStart})`);
      return { message: `Removed ${delta} sessions from this week's limit` };
    }

    case "suspend": {
      const activeSub = await db.getActiveSubscription(input.userId);
      if (activeSub) {
        await db.updateSubscription(activeSub.id, {
          status: "suspended",
          suspendedAt: new Date(),
        });
      }
      // Also suspend legacy membership if exists
      const activeMembership = await db.getActiveMembership(input.userId);
      if (activeMembership) {
        await db.updateMembership(activeMembership.id, { status: "cancelled" });
      }

      console.log(`[Admin] Suspended user ${input.userId}`);
      return { message: "User subscription suspended" };
    }

    case "reactivate": {
      // Find the most recent suspended subscription
      const subs = await db.getUserSubscriptions(input.userId);
      const suspendedSub = subs.find((s) => s.status === "suspended");
      if (suspendedSub) {
        await db.updateSubscription(suspendedSub.id, {
          status: "active",
          suspendedAt: null,
        });
        console.log(`[Admin] Reactivated subscription for user ${input.userId}`);
        return { message: "User subscription reactivated" };
      }
      return { message: "No suspended subscription found to reactivate" };
    }

    default:
      throw new Error(`Unknown change type: ${input.changeType}`);
  }
}

/**
 * Get comprehensive admin dashboard statistics.
 */
export async function getDashboardStats() {
  const allUsers = await db.getAllUsers();
  const allBookings = await db.getAllBookings();
  const allSubscriptions = await db.getAllSubscriptions();
  const allMemberships = await db.getAllMemberships();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activeSubscriptions = allSubscriptions.filter((s) => s.status === "active");
  const activeMemberships = allMemberships.filter((m) => m.status === "active");
  const pendingBookings = allBookings.filter((b) => b.status === "pending");
  const confirmedBookings = allBookings.filter((b) => b.status === "confirmed");
  const recentBookings = allBookings.filter(
    (b) => new Date(b.createdAt) >= sevenDaysAgo
  );

  const revenue = await db.getRevenueSummary(thirtyDaysAgo, now);

  // Weekly usage stats
  const weekStart = getWeekStartDate(now, GYM_TIMEZONE);
  const weeklyUsageData = await db.getAllWeeklyUsageForWeek(weekStart);
  const totalSessionsThisWeek = weeklyUsageData.reduce(
    (sum, u) => sum + u.sessionsUsed,
    0
  );

  return {
    totalUsers: allUsers.length,
    activeMembers: activeSubscriptions.length + activeMemberships.length,
    activeSubscriptions: activeSubscriptions.length,
    totalBookings: allBookings.length,
    pendingBookings: pendingBookings.length,
    confirmedBookings: confirmedBookings.length,
    recentBookings: recentBookings.length,
    totalSessionsThisWeek,
    revenue: {
      last30Days: revenue.totalRevenue,
      transactionCount: revenue.transactionCount,
      failedPayments: revenue.failedPayments,
    },
  };
}

/**
 * Get detailed member info including subscription, usage, and override history.
 */
export async function getMemberDetail(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) return null;

  const activeSub = await db.getActiveSubscription(userId);
  const activeMembership = await db.getActiveMembership(userId);
  const subs = await db.getUserSubscriptions(userId);
  const bookingsData = await db.getUserBookings(userId);
  const usageHistory = await db.getUserWeeklyUsageHistory(userId);
  const overrides = await db.getAdminOverridesForUser(userId);

  let tierName = "";
  let weeklyLimit = 0;
  if (activeSub) {
    const tier = await db.getMembershipTierById(activeSub.tierId);
    tierName = tier?.name ?? "";
    weeklyLimit = tier?.sessionsPerWeek ?? 0;
  } else if (activeMembership) {
    const tier = await db.getMembershipTierById(activeMembership.tierId);
    tierName = tier?.name ?? "";
    weeklyLimit = tier?.sessionsPerWeek ?? 0;
  }

  const weekStart = getWeekStartDate(new Date(), GYM_TIMEZONE);
  const currentUsage = await db.getWeeklyUsage(userId, weekStart);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    },
    subscription: activeSub
      ? {
          id: activeSub.id,
          status: activeSub.status,
          tierId: activeSub.tierId,
          tierName,
          currentPeriodStart: activeSub.currentPeriodStart,
          currentPeriodEnd: activeSub.currentPeriodEnd,
        }
      : null,
    legacyMembership: activeMembership
      ? {
          id: activeMembership.id,
          status: activeMembership.status,
          startDate: activeMembership.startDate,
          endDate: activeMembership.endDate,
        }
      : null,
    currentWeek: {
      weekStart,
      sessionsUsed: currentUsage?.sessionsUsed ?? 0,
      sessionsLimit: currentUsage?.sessionsLimitSnapshot ?? weeklyLimit,
    },
    usageHistory,
    recentBookings: bookingsData.slice(0, 20),
    overrides: overrides.slice(0, 20),
    allSubscriptions: subs,
  };
}
