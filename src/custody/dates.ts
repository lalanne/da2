/**
 * Civil-date arithmetic for the custody calendar (spec 004). Dates are
 * `yyyy-mm-dd` strings and times are `HH:mm` strings. All day math goes
 * through UTC epoch-days, so it is exact and DST-free — no real timestamps
 * are ever crossed.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isHhMm(value: string): boolean {
  return HHMM.test(value);
}

/** Epoch day number for a civil `yyyy-mm-dd`. */
export function toDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function fromDayNumber(n: number): string {
  const date = new Date(n * 86_400_000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `b − a` in whole civil days. */
export function daysBetween(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

export function addDays(iso: string, n: number): string {
  return fromDayNumber(toDayNumber(iso) + n);
}

/** Non-negative modulo. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Minutes since midnight for `HH:mm` (`"00:00"` → 0, `"24:00"` → 1440). */
export function minutesOfDay(hhmm: string): number {
  if (hhmm === '24:00') return 1440;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 0 = Monday … 6 = Sunday (Latin-American week start). */
export function weekdayMonday0(iso: string): number {
  // 1970-01-01 was a Thursday → epoch-day 0 has JS getUTCDay() 4.
  return mod(toDayNumber(iso) + 3, 7);
}

/** The `yyyy-mm-dd` for "today" in the given IANA timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  try {
    // en-CA formats as yyyy-mm-dd.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(now);
  }
}

/** All `yyyy-mm-dd` in the month containing `iso` (1st … last). */
export function daysInMonth(iso: string): string[] {
  const [y, m] = iso.split('-').map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: string[] = [];
  for (let d = 1; d <= count; d += 1) {
    out.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Monday-first calendar cells covering the month of `iso` — whole weeks only,
 * so `.length` is a multiple of 7 (5 or 6 rows). `inMonth` is false for the
 * leading/trailing days that spill from the neighbouring months.
 */
export function monthGrid(iso: string): { iso: string; inMonth: boolean }[] {
  const first = startOfMonth(iso);
  const lead = weekdayMonday0(first);
  const count = daysInMonth(first).length;
  const cells = Math.ceil((lead + count) / 7) * 7;
  const month = iso.slice(0, 7);
  return Array.from({ length: cells }, (_, i) => {
    const day = addDays(first, i - lead);
    return { iso: day, inMonth: day.slice(0, 7) === month };
  });
}
