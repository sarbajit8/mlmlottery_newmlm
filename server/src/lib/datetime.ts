import { env } from '../config/env.js';

/**
 * The business timezone drives every "what draw window is open right now / for which date" decision.
 * We never rely on the server OS timezone (EC2 is UTC by default) — `Intl.DateTimeFormat` with an
 * explicit `timeZone` gives the correct wall clock wherever the process runs.
 */
const BUSINESS_TZ = env.TZ; // e.g. "Asia/Kolkata"

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Current wall clock in the business timezone. */
export function businessNow(at: Date = new Date()): { date: string; minutesOfDay: number } {
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`, // YYYY-MM-DD, business TZ
    minutesOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Today's date (YYYY-MM-DD) in the business timezone — the draw date agents are currently selling for. */
export function currentDrawDate(): string {
  return businessNow().date;
}

/** Parse a YYYY-MM-DD string to the UTC-midnight Date that Prisma stores in a `@db.Date` column. */
export function drawDateToUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Format a Prisma `@db.Date` value back to its YYYY-MM-DD string (it is stored at UTC midnight). */
export function drawDateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
