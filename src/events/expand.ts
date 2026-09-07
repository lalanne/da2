import { addDays, daysBetween } from '../custody/dates';
import type { KidEvent } from '../models/Event';

/**
 * The `yyyy-mm-dd` dates on which `event` occurs within `[rangeStart,
 * rangeEnd]` (inclusive). Non-recurring events occur once; weekly events
 * every 7th day from `date` through `min(recurrence.until, rangeEnd)`.
 */
export function occurrencesInRange(
  event: KidEvent,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  if (rangeEnd < rangeStart) return [];

  if (!event.recurrence) {
    return event.date >= rangeStart && event.date <= rangeEnd ? [event.date] : [];
  }

  const end = event.recurrence.until < rangeEnd ? event.recurrence.until : rangeEnd;
  if (end < event.date) return [];

  const skip = Math.max(0, Math.ceil(daysBetween(event.date, rangeStart) / 7));
  const out: string[] = [];
  for (let cur = addDays(event.date, skip * 7); cur <= end; cur = addDays(cur, 7)) {
    if (cur >= rangeStart) out.push(cur);
  }
  return out;
}

/** Events (with a recurring occurrence counting) that land on `date`. */
export function eventsForDay(events: KidEvent[], date: string): KidEvent[] {
  return events.filter((e) => occurrencesInRange(e, date, date).length > 0);
}

/** Count of events per `yyyy-mm-dd` across a range — for the month-grid dots. */
export function eventCountsByDate(
  events: KidEvent[],
  rangeStart: string,
  rangeEnd: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    for (const d of occurrencesInRange(e, rangeStart, rangeEnd)) {
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  return counts;
}

export interface UpcomingItem {
  event: KidEvent;
  date: string;
}

/** Occurrences from `today` forward, sorted by (date, startTime), capped. */
export function upcomingOccurrences(
  events: KidEvent[],
  today: string,
  horizonDays: number,
  limit: number,
): UpcomingItem[] {
  const end = addDays(today, horizonDays);
  const items: UpcomingItem[] = [];
  for (const event of events) {
    for (const date of occurrencesInRange(event, today, end)) {
      items.push({ event, date });
    }
  }
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const at = a.event.startTime ?? '';
    const bt = b.event.startTime ?? '';
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  return items.slice(0, limit);
}
