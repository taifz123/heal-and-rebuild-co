/**
 * Timezone Service
 *
 * Handles week-start date calculations in the gym's timezone.
 * The gym operates in Australia/Sydney timezone.
 * Week starts on Monday (ISO standard).
 */

/**
 * Get the Monday (week start) for a given date in the specified timezone.
 * Returns a date string in YYYY-MM-DD format.
 */
export function getWeekStartDate(date: Date, timezone: string): string {
  // Format the date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value);
  const day = parseInt(parts.find((p) => p.type === "day")!.value);
  const weekday = parts.find((p) => p.type === "weekday")!.value;

  // Map weekday abbreviation to day offset from Monday
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const offset = dayMap[weekday] ?? 0;

  // Calculate Monday by subtracting the offset
  const mondayDate = new Date(year, month - 1, day - offset);
  const y = mondayDate.getFullYear();
  const m = String(mondayDate.getMonth() + 1).padStart(2, "0");
  const d = String(mondayDate.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * Get the next Monday after the given date in the specified timezone.
 */
export function getNextWeekStartDate(date: Date, timezone: string): string {
  const currentWeekStart = getWeekStartDate(date, timezone);
  const parts = currentWeekStart.split("-").map(Number);
  const nextMonday = new Date(parts[0], parts[1] - 1, parts[2] + 7);
  const y = nextMonday.getFullYear();
  const m = String(nextMonday.getMonth() + 1).padStart(2, "0");
  const d = String(nextMonday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a UTC date to the gym's local timezone for display.
 */
export function formatInGymTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    ...options,
  }).format(date);
}
