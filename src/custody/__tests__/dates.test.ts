import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  formatMinutes,
  fromDayNumber,
  isHhMm,
  isIsoDate,
  minutesOfDay,
  mod,
  startOfMonth,
  toDayNumber,
  todayInTimezone,
  weekdayMonday0,
} from '../dates';

describe('custody/dates', () => {
  it('round-trips day numbers', () => {
    expect(fromDayNumber(toDayNumber('2026-09-07'))).toBe('2026-09-07');
    expect(toDayNumber('1970-01-01')).toBe(0);
    expect(toDayNumber('1970-01-02')).toBe(1);
  });

  it('daysBetween is exact across month and year boundaries (no DST drift)', () => {
    expect(daysBetween('2026-09-07', '2026-09-14')).toBe(7);
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2026-09-14', '2026-09-07')).toBe(-7);
    // spans a southern-hemisphere DST change (Chile shifts in April/September)
    expect(daysBetween('2026-04-01', '2026-05-01')).toBe(30);
    expect(daysBetween('2026-09-01', '2027-09-01')).toBe(365);
  });

  it('addDays / addMonths', () => {
    expect(addDays('2026-09-07', 7)).toBe('2026-09-14');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-01');
  });

  it('mod is always non-negative', () => {
    expect(mod(-1, 14)).toBe(13);
    expect(mod(15, 14)).toBe(1);
    expect(mod(0, 7)).toBe(0);
  });

  it('weekdayMonday0: 0 = Monday … 6 = Sunday', () => {
    expect(weekdayMonday0('2026-09-07')).toBe(0); // a Monday
    expect(weekdayMonday0('2026-09-13')).toBe(6); // the Sunday after
    expect(weekdayMonday0('2026-09-12')).toBe(5); // Saturday
  });

  it('minutesOfDay / formatMinutes', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('18:00')).toBe(1080);
    expect(minutesOfDay('24:00')).toBe(1440);
    expect(formatMinutes(1080)).toBe('18:00');
    expect(formatMinutes(1440)).toBe('24:00');
  });

  it('validators', () => {
    expect(isIsoDate('2026-09-07')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-9-7')).toBe(false);
    expect(isHhMm('18:00')).toBe(true);
    expect(isHhMm('24:00')).toBe(false);
    expect(isHhMm('7:00')).toBe(false);
  });

  it('daysInMonth / startOfMonth', () => {
    expect(daysInMonth('2026-02-15')).toHaveLength(28);
    expect(daysInMonth('2028-02-15')).toHaveLength(29);
    expect(daysInMonth('2026-09-01')[0]).toBe('2026-09-01');
    expect(daysInMonth('2026-09-01').at(-1)).toBe('2026-09-30');
    expect(startOfMonth('2026-09-17')).toBe('2026-09-01');
  });

  it('todayInTimezone formats yyyy-mm-dd and honours the zone', () => {
    // 2026-01-01 02:00 UTC is still 2025-12-31 23:00 in Santiago (summer, UTC-3).
    const at = new Date('2026-01-01T02:00:00Z');
    expect(todayInTimezone('America/Santiago', at)).toBe('2025-12-31');
    expect(todayInTimezone('Europe/Madrid', at)).toBe('2026-01-01');
    expect(todayInTimezone('Not/AZone', at)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
