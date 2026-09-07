import { buildEventInput, type EventFormState } from '../forms';
import { strings } from '../../i18n/strings';

function form(overrides: Partial<EventFormState> = {}): EventFormState {
  return {
    title: 'Dentista',
    type: 'doctor',
    childIds: ['c1'],
    date: '2026-10-12',
    allDay: false,
    startTime: '15:00',
    endTime: '',
    location: '',
    notes: '',
    repeats: false,
    until: '',
    ...overrides,
  };
}

const e = strings.events.form.errors;

describe('buildEventInput', () => {
  it('builds a valid single event, trimming optional strings to null', () => {
    const r = buildEventInput(form({ title: '  Dentista  ', location: '  ', notes: 'llevar carnet' }));
    expect(r).toEqual({
      ok: true,
      value: {
        title: 'Dentista',
        type: 'doctor',
        childIds: ['c1'],
        date: '2026-10-12',
        allDay: false,
        startTime: '15:00',
        endTime: null,
        location: null,
        notes: 'llevar carnet',
        recurrence: null,
      },
    });
  });

  it('an all-day event drops the times', () => {
    const r = buildEventInput(form({ allDay: true, startTime: '15:00', endTime: '16:00' }));
    expect(r.ok && r.value.startTime).toBeNull();
    expect(r.ok && r.value.endTime).toBeNull();
  });

  it('rejects a missing title, bad date, bad time and reversed range', () => {
    expect(buildEventInput(form({ title: '   ' }))).toEqual({ ok: false, error: e.missingTitle });
    expect(buildEventInput(form({ date: '12 oct' }))).toEqual({ ok: false, error: e.badDate });
    expect(buildEventInput(form({ startTime: '3pm' }))).toEqual({ ok: false, error: e.badTime });
    expect(
      buildEventInput(form({ startTime: '16:00', endTime: '15:00' })),
    ).toEqual({ ok: false, error: e.timeOrder });
  });

  it('recurrence is only allowed on training events', () => {
    expect(
      buildEventInput(form({ type: 'doctor', repeats: true, until: '2026-12-15' })),
    ).toEqual({ ok: false, error: e.recurrenceType });

    const ok = buildEventInput(
      form({ type: 'training', repeats: true, until: '2026-12-15' }),
    );
    expect(ok).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ recurrence: { freq: 'weekly', until: '2026-12-15' } }),
      }),
    );
  });

  it('rejects an `until` that is on or before the event date', () => {
    expect(
      buildEventInput(form({ type: 'training', repeats: true, date: '2026-12-15', until: '2026-12-01' })),
    ).toEqual({ ok: false, error: e.untilBeforeDate });
  });
});
