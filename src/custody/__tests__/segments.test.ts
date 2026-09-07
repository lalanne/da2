import type { DayOverrideProposal, PatternProposal } from '../../models/Custody';
import {
  buildCycle,
  custodyDayParent,
  dayAssignment,
  patternForDate,
  segmentsForCalendarDay,
} from '..';

function pattern(overrides: Partial<PatternProposal> = {}): PatternProposal {
  return {
    id: 'p1',
    type: 'pattern',
    proposerId: 'u1',
    status: 'approved',
    createdAt: 0,
    resolvedAt: 1,
    resolvedBy: 'u2',
    cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    anchorDate: '2026-09-07', // a Monday
    changeoverTime: '18:00',
    effectiveFrom: '2026-09-01',
    presetLabel: 'alternating-weeks',
    ...overrides,
  };
}

function override(o: Partial<DayOverrideProposal> = {}): DayOverrideProposal {
  return {
    id: 'o1',
    type: 'day-override',
    proposerId: 'u1',
    status: 'approved',
    createdAt: 100,
    resolvedAt: 101,
    resolvedBy: 'u2',
    date: '2026-09-12',
    assignedTo: 0,
    startTime: null,
    endTime: null,
    ...o,
  };
}

describe('patternForDate', () => {
  it('picks the approved pattern with the greatest effectiveFrom <= date', () => {
    const a = pattern({ id: 'a', effectiveFrom: '2026-09-01' });
    const b = pattern({ id: 'b', effectiveFrom: '2026-10-01', cycle: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] });
    expect(patternForDate([a, b], '2026-09-20')?.id).toBe('a');
    expect(patternForDate([a, b], '2026-10-01')?.id).toBe('b');
    expect(patternForDate([a, b], '2026-08-20')).toBeNull();
  });

  it('ignores non-approved patterns', () => {
    const pending = pattern({ id: 'x', status: 'pending' });
    expect(patternForDate([pending], '2026-09-20')).toBeNull();
  });
});

describe('custodyDayParent', () => {
  it('cycles through the array from the anchor, forwards and backwards', () => {
    const p = pattern();
    expect(custodyDayParent(p, '2026-09-07')).toBe(0); // anchor, cycle[0]
    expect(custodyDayParent(p, '2026-09-13')).toBe(0); // cycle[6]
    expect(custodyDayParent(p, '2026-09-14')).toBe(1); // cycle[7]
    expect(custodyDayParent(p, '2026-09-21')).toBe(0); // cycle[14 % 14 = 0]
    expect(custodyDayParent(p, '2026-09-06')).toBe(1); // cycle[-1 → 13]
  });
});

describe('segmentsForCalendarDay', () => {
  it('returns [] when no pattern governs the date', () => {
    expect(segmentsForCalendarDay('2026-08-01', [pattern()], [])).toEqual([]);
  });

  it('a mid-week day is solid', () => {
    // Wed 2026-09-09: custody day started Mon (parent 0), no changeover today.
    expect(segmentsForCalendarDay('2026-09-09', [pattern()], [])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 0 },
    ]);
  });

  it('the changeover day is split at the changeover time', () => {
    // Mon 2026-09-14 at 18:00 custody passes from parent 0 to parent 1.
    expect(segmentsForCalendarDay('2026-09-14', [pattern()], [])).toEqual([
      { fromMin: 0, toMin: 1080, parentIndex: 0 },
      { fromMin: 1080, toMin: 1440, parentIndex: 1 },
    ]);
    expect(dayAssignment('2026-09-14', [pattern()], []).changeoverMin).toBe(1080);
  });

  it('a midnight changeover produces a solid day', () => {
    const p = pattern({ changeoverTime: '00:00' });
    expect(segmentsForCalendarDay('2026-09-14', [p], [])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 1 },
    ]);
  });

  it('a full-day override replaces the pattern for that date', () => {
    // Sat 2026-09-12 is parent 0 by pattern; override the whole day to parent 1.
    const o = override({ date: '2026-09-12', assignedTo: 1 });
    expect(segmentsForCalendarDay('2026-09-12', [pattern()], [o])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 1 },
    ]);
  });

  it('a partial-day override clips the pattern base and merges neighbours', () => {
    // Wed 2026-09-09 (solid parent 0). Override 10:00–14:00 to parent 1.
    const o = override({ date: '2026-09-09', assignedTo: 1, startTime: '10:00', endTime: '14:00' });
    expect(segmentsForCalendarDay('2026-09-09', [pattern()], [o])).toEqual([
      { fromMin: 0, toMin: 600, parentIndex: 0 },
      { fromMin: 600, toMin: 840, parentIndex: 1 },
      { fromMin: 840, toMin: 1440, parentIndex: 0 },
    ]);
  });

  it('an override on a changeover day layers over both base segments', () => {
    // Mon 2026-09-14: base 0 until 18:00 then 1. Override 12:00–20:00 to 0.
    const o = override({ date: '2026-09-14', assignedTo: 0, startTime: '12:00', endTime: '20:00' });
    expect(segmentsForCalendarDay('2026-09-14', [pattern()], [o])).toEqual([
      { fromMin: 0, toMin: 1200, parentIndex: 0 },
      { fromMin: 1200, toMin: 1440, parentIndex: 1 },
    ]);
  });

  it('the later override wins where two overlap', () => {
    const early = override({ id: 'e', createdAt: 1, date: '2026-09-09', assignedTo: 1, startTime: '09:00', endTime: '17:00' });
    const late = override({ id: 'l', createdAt: 2, date: '2026-09-09', assignedTo: 0, startTime: '12:00', endTime: '13:00' });
    expect(segmentsForCalendarDay('2026-09-09', [pattern()], [early, late])).toEqual([
      { fromMin: 0, toMin: 540, parentIndex: 0 },
      { fromMin: 540, toMin: 720, parentIndex: 1 },
      { fromMin: 720, toMin: 780, parentIndex: 0 },
      { fromMin: 780, toMin: 1020, parentIndex: 1 },
      { fromMin: 1020, toMin: 1440, parentIndex: 0 },
    ]);
  });

  it('ignores non-approved overrides', () => {
    const pendingOverride = override({ date: '2026-09-12', assignedTo: 1, status: 'pending' });
    expect(segmentsForCalendarDay('2026-09-12', [pattern()], [pendingOverride])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 0 },
    ]);
  });

  it('honours a pattern-timeline switch mid-month', () => {
    const a = pattern({ id: 'a', effectiveFrom: '2026-09-01' });
    const b = pattern({
      id: 'b',
      effectiveFrom: '2026-09-15',
      cycle: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    });
    // Thursdays (mid-week, solid), same cycle position, different pattern.
    expect(segmentsForCalendarDay('2026-09-10', [a, b], [])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 0 },
    ]);
    expect(segmentsForCalendarDay('2026-09-24', [a, b], [])).toEqual([
      { fromMin: 0, toMin: 1440, parentIndex: 1 },
    ]);
  });
});

describe('buildCycle presets', () => {
  it('alternating-weeks is a 14-day 7+7 split', () => {
    expect(buildCycle('alternating-weeks', '2026-09-07')).toEqual([
      0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it('every-other-weekend puts a weekend with parent 1 in week 1 only', () => {
    // anchored on a Monday → no rotation.
    const cycle = buildCycle('every-other-weekend', '2026-09-07');
    expect(cycle).toHaveLength(14);
    expect(cycle[5]).toBe(1); // Sat wk1
    expect(cycle[6]).toBe(1); // Sun wk1
    expect(cycle[12]).toBe(0); // Sat wk2
    expect(cycle.slice(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('rotates a preset when the anchor is not a Monday', () => {
    const mon = buildCycle('2-2-3', '2026-09-07');
    const wed = buildCycle('2-2-3', '2026-09-09');
    expect(wed).toEqual([...mon.slice(2), ...mon.slice(0, 2)]);
  });
});
