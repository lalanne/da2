import { buildOverrideInput, buildPatternInput } from '../forms';
import { strings } from '../../../i18n/strings';

describe('buildPatternInput', () => {
  const base = {
    preset: 'alternating-weeks' as const,
    startsWith: 0,
    anchorDate: '2026-09-07',
    changeoverTime: '18:00',
    effectiveFrom: '2026-09-07',
  };

  it('produces a 14-day cycle for a preset', () => {
    const r = buildPatternInput({ ...base, preset: '2-2-3' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.cycle).toHaveLength(14);
      expect(r.value.presetLabel).toBe('2-2-3');
    }
  });

  it('flips the cycle when the other parent is residential', () => {
    const r = buildPatternInput({ ...base, startsWith: 1 });
    expect(r.ok && r.value.cycle.slice(0, 7)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('rejects a bad date, bad time, or effectiveFrom before the anchor', () => {
    expect(buildPatternInput({ ...base, anchorDate: '7 sept' })).toEqual({
      ok: false,
      error: strings.custody.patternSetup.errors.badDate,
    });
    expect(buildPatternInput({ ...base, changeoverTime: '6pm' })).toEqual({
      ok: false,
      error: strings.custody.patternSetup.errors.badTime,
    });
    expect(buildPatternInput({ ...base, effectiveFrom: '2026-09-01' })).toEqual({
      ok: false,
      error: strings.custody.patternSetup.errors.effectiveBeforeAnchor,
    });
  });
});

describe('buildOverrideInput', () => {
  it('a full-day override needs no times', () => {
    expect(
      buildOverrideInput({ date: '2026-09-12', assignedTo: 1, allDay: true, from: '', to: '' }),
    ).toEqual({
      ok: true,
      value: { date: '2026-09-12', assignedTo: 1, startTime: null, endTime: null },
    });
  });

  it('a partial override keeps the entered times', () => {
    const r = buildOverrideInput({
      date: '2026-09-12',
      assignedTo: 0,
      allDay: false,
      from: '10:00',
      to: '14:00',
    });
    expect(r).toEqual({
      ok: true,
      value: { date: '2026-09-12', assignedTo: 0, startTime: '10:00', endTime: '14:00' },
    });
  });

  it('rejects a malformed or out-of-order time range', () => {
    expect(
      buildOverrideInput({ date: '2026-09-12', assignedTo: 0, allDay: false, from: '9am', to: '' }),
    ).toEqual({ ok: false, error: strings.custody.proposeOverride.errors.badTime });
    expect(
      buildOverrideInput({ date: '2026-09-12', assignedTo: 0, allDay: false, from: '20:00', to: '10:00' }),
    ).toEqual({ ok: false, error: strings.custody.proposeOverride.errors.order });
  });
});
