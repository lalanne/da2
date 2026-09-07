import type { DayOverrideProposal, PatternProposal } from '../models/Custody';
import { addDays, daysBetween, minutesOfDay, mod } from './dates';

export interface Segment {
  /** Minutes since midnight, [fromMin, toMin). */
  fromMin: number;
  toMin: number;
  /** parentIds index (0 | 1). */
  parentIndex: number;
}

/** The approved pattern with the greatest `effectiveFrom <= date`, or null. */
export function patternForDate(
  patterns: PatternProposal[],
  date: string,
): PatternProposal | null {
  let best: PatternProposal | null = null;
  for (const p of patterns) {
    if (p.status !== 'approved') continue;
    if (p.effectiveFrom > date) continue;
    if (!best || p.effectiveFrom > best.effectiveFrom) best = p;
  }
  return best;
}

/** Which parent owns the custody day that *starts* on `date`. */
export function custodyDayParent(pattern: PatternProposal, date: string): number {
  const i = mod(daysBetween(pattern.anchorDate, date), pattern.cycle.length);
  return pattern.cycle[i];
}

function baseSlices(pattern: PatternProposal, date: string): Segment[] {
  const changeover = minutesOfDay(pattern.changeoverTime);
  const evening = custodyDayParent(pattern, date);
  if (changeover <= 0) return [{ fromMin: 0, toMin: 1440, parentIndex: evening }];
  const morning = custodyDayParent(pattern, addDays(date, -1));
  if (changeover >= 1440) return [{ fromMin: 0, toMin: 1440, parentIndex: morning }];
  return [
    { fromMin: 0, toMin: changeover, parentIndex: morning },
    { fromMin: changeover, toMin: 1440, parentIndex: evening },
  ];
}

interface OverrideSlice {
  fromMin: number;
  toMin: number;
  parentIndex: number;
  order: number;
}

function overrideSlices(overrides: DayOverrideProposal[], date: string): OverrideSlice[] {
  return overrides
    .filter((o) => o.status === 'approved' && o.date === date)
    .map((o) => ({
      fromMin: o.startTime ? minutesOfDay(o.startTime) : 0,
      toMin: o.endTime ? minutesOfDay(o.endTime) : 1440,
      parentIndex: o.assignedTo,
      order: o.createdAt,
    }))
    .filter((s) => s.toMin > s.fromMin);
}

/**
 * Ordered, gap-free, merged custody segments for one calendar day.
 * `[]` when no pattern governs the date. Length 1 = solid, 2+ = split
 * (the boundary between the first two is the pattern changeover unless an
 * override moved it).
 */
export function segmentsForCalendarDay(
  date: string,
  patterns: PatternProposal[],
  overrides: DayOverrideProposal[],
): Segment[] {
  const pattern = patternForDate(patterns, date);
  if (!pattern) return [];

  const base = baseSlices(pattern, date);
  const ovs = overrideSlices(overrides, date);

  const bounds = new Set<number>([0, 1440]);
  for (const s of [...base, ...ovs]) {
    bounds.add(s.fromMin);
    bounds.add(s.toMin);
  }
  const marks = [...bounds].filter((b) => b >= 0 && b <= 1440).sort((a, b) => a - b);

  const out: Segment[] = [];
  for (let i = 0; i < marks.length - 1; i += 1) {
    const from = marks[i];
    const to = marks[i + 1];
    if (to <= from) continue;
    const mid = (from + to) / 2;

    let parentIndex: number | null = null;
    let bestOrder = -Infinity;
    for (const s of ovs) {
      if (s.fromMin <= mid && mid < s.toMin && s.order >= bestOrder) {
        bestOrder = s.order;
        parentIndex = s.parentIndex;
      }
    }
    if (parentIndex === null) {
      const b = base.find((s) => s.fromMin <= mid && mid < s.toMin);
      if (b) parentIndex = b.parentIndex;
    }
    if (parentIndex === null) continue;

    const last = out[out.length - 1];
    if (last && last.parentIndex === parentIndex && last.toMin === from) {
      last.toMin = to;
    } else {
      out.push({ fromMin: from, toMin: to, parentIndex });
    }
  }
  return out;
}

export interface DayAssignment {
  segments: Segment[];
  /** true when custody changes hands during the day. */
  isSplit: boolean;
  /** Minutes-of-day of the (first) changeover, when split. */
  changeoverMin: number | null;
}

export function dayAssignment(
  date: string,
  patterns: PatternProposal[],
  overrides: DayOverrideProposal[],
): DayAssignment {
  const segments = segmentsForCalendarDay(date, patterns, overrides);
  const isSplit = segments.length > 1;
  return {
    segments,
    isSplit,
    changeoverMin: isSplit ? segments[0].toMin : null,
  };
}
