import { formatCivilDate, formatMonthYear } from '../dates';

describe('i18n/dates', () => {
  it('formatCivilDate: "2026-09-12" → "12 sep 2026" (no zero-pad on the day)', () => {
    expect(formatCivilDate('2026-09-12')).toBe('12 sep 2026');
    expect(formatCivilDate('2026-01-05')).toBe('5 ene 2026');
    expect(formatCivilDate('2027-12-31')).toBe('31 dic 2027');
  });

  it('formatMonthYear: full Spanish month + year', () => {
    expect(formatMonthYear('2026-09-01')).toBe('septiembre 2026');
    expect(formatMonthYear('2026-02')).toBe('febrero 2026');
  });
});
