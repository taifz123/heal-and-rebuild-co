/**
 * Weekly Quota Reset Service
 *
 * Automatically creates fresh weekly_usage rows for all active subscribers
 * at the start of each new week (Monday 00:00 in the gym timezone).
 *
 * This runs as a setInterval-based cron inside the Node.js process.
 * On Replit, this is sufficient since the server is always running.
 *
 * The reset is idempotent: upsertWeeklyUsage will not overwrite existing rows.
 */

import * as db from "../db";
import { GYM_TIMEZONE } from "../../drizzle/schema";
import { getWeekStartDate } from "./timezoneService";

/** Check interval: every 15 minutes */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

let lastProcessedWeek = "";

/**
 * Run the weekly reset check.
 * Creates weekly_usage rows for all active subscribers for the current week.
 */
export async function runWeeklyResetCheck() {
  try {
    const now = new Date();
    const currentWeekStart = getWeekStartDate(now, GYM_TIMEZONE);

    // Skip if we already processed this week
    if (currentWeekStart === lastProcessedWeek) {
      return;
    }

    console.log(`[WeeklyReset] Processing week starting ${currentWeekStart}`);

    // Get all active subscriptions
    const activeSubscriptions = await db.getAllActiveSubscriptions();

    let created = 0;
    for (const sub of activeSubscriptions) {
      const tier = await db.getMembershipTierById(sub.tierId);
      if (!tier) continue;

      // Create or get the weekly usage row (idempotent)
      await db.upsertWeeklyUsage(sub.userId, currentWeekStart, tier.sessionsPerWeek);
      created++;
    }

    lastProcessedWeek = currentWeekStart;
    console.log(
      `[WeeklyReset] Initialized ${created} weekly usage rows for week ${currentWeekStart}`
    );
  } catch (error) {
    console.error("[WeeklyReset] Error during weekly reset:", error);
  }
}

/**
 * Start the weekly reset scheduler.
 * Runs immediately on startup, then every CHECK_INTERVAL_MS.
 */
export function startWeeklyResetScheduler() {
  console.log("[WeeklyReset] Scheduler started (checking every 15 minutes)");

  // Run immediately on startup
  setTimeout(() => {
    runWeeklyResetCheck().catch(console.error);
  }, 5000); // 5s delay to let DB connect

  // Then check periodically
  setInterval(() => {
    runWeeklyResetCheck().catch(console.error);
  }, CHECK_INTERVAL_MS);
}
