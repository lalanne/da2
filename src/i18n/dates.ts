import { strings } from './strings';

/** `"2026-09-12"` → `"12 sep 2026"` (es-CL, for a DateField's closed state). */
export function formatCivilDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${strings.dateTime.monthsShort[m - 1]} ${y}`;
}

/** `"2026-09"` (or any `yyyy-mm[-dd]`) → `"septiembre 2026"` — a calendar header. */
export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return strings.custody.monthLabel(strings.custody.months[m - 1], y);
}
