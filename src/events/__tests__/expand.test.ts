import {
  eventCountsByDate,
  eventsForDay,
  occurrencesInRange,
  upcomingOccurrences,
} from '../expand';
import type { KidEvent } from '../../models/Event';

function ev(overrides: Partial<KidEvent> = {}): KidEvent {
  return {
    id: 'e1',
    title: 'Dentista',
    type: 'doctor',
    childIds: ['c1'],
    date: '2026-10-12',
    allDay: false,
    startTime: '15:00',
    endTime: null,
    location: null,
    notes: null,
    recurrence: null,
    createdBy: 'u1',
    createdAt: 0,
    updatedBy: 'u1',
    updatedAt: 0,
    ...overrides,
  };
}

describe('occurrencesInRange', () => {
  it('a single event occurs once, only if in range', () => {
    expect(occurrencesInRange(ev(), '2026-10-01', '2026-10-31')).toEqual(['2026-10-12']);
    expect(occurrencesInRange(ev(), '2026-11-01', '2026-11-30')).toEqual([]);
    expect(occurrencesInRange(ev(), '2026-10-12', '2026-10-12')).toEqual(['2026-10-12']);
  });

  it('a weekly training expands every 7 days through `until`', () => {
    const training = ev({
      type: 'training',
      date: '2026-09-01', // a Tuesday
      recurrence: { freq: 'weekly', until: '2026-12-15' },
    });
    const all = occurrencesInRange(training, '2026-09-01', '2027-01-01');
    expect(all[0]).toBe('2026-09-01');
    expect(all[1]).toBe('2026-09-08');
    expect(all.at(-1)).toBe('2026-12-15');
    expect(all.every((d, i) => i === 0 || d > all[i - 1])).toBe(true);
    // nothing after `until`
    expect(occurrencesInRange(training, '2026-12-16', '2027-06-01')).toEqual([]);
  });

  it('clamps to the requested range without iterating from the distant past', () => {
    const training = ev({
      type: 'training',
      date: '2020-01-07',
      recurrence: { freq: 'weekly', until: '2030-01-01' },
    });
    const oct = occurrencesInRange(training, '2026-10-01', '2026-10-31');
    expect(oct).toHaveLength(4);
    expect(oct[0] >= '2026-10-01').toBe(true);
    expect(oct.at(-1)! <= '2026-10-31').toBe(true);
  });

  it('returns [] for an inverted range', () => {
    expect(occurrencesInRange(ev(), '2026-10-31', '2026-10-01')).toEqual([]);
  });
});

describe('eventsForDay / eventCountsByDate', () => {
  const dentist = ev({ id: 'a', date: '2026-10-12' });
  const training = ev({
    id: 'b',
    type: 'training',
    date: '2026-10-06',
    recurrence: { freq: 'weekly', until: '2026-10-27' },
  });

  it('eventsForDay includes a recurring occurrence that lands on the date', () => {
    expect(eventsForDay([dentist, training], '2026-10-13').map((e) => e.id)).toEqual(['b']);
    expect(eventsForDay([dentist, training], '2026-10-12').map((e) => e.id)).toEqual(['a']);
    expect(eventsForDay([dentist, training], '2026-10-14')).toEqual([]);
  });

  it('eventCountsByDate counts every occurrence in the range', () => {
    const counts = eventCountsByDate([dentist, training], '2026-10-01', '2026-10-31');
    expect(counts.get('2026-10-12')).toBe(1);
    expect(counts.get('2026-10-06')).toBe(1);
    expect(counts.get('2026-10-13')).toBe(1);
    expect(counts.get('2026-10-20')).toBe(1);
  });
});

describe('upcomingOccurrences', () => {
  it('sorts by date then start time and caps the list', () => {
    const events = [
      ev({ id: 'late', date: '2026-10-20', startTime: '09:00' }),
      ev({ id: 'earlyPM', date: '2026-10-12', startTime: '16:00' }),
      ev({ id: 'earlyAM', date: '2026-10-12', startTime: '08:00' }),
      ev({ id: 'past', date: '2026-09-01' }),
    ];
    const items = upcomingOccurrences(events, '2026-10-01', 90, 2);
    expect(items.map((i) => i.event.id)).toEqual(['earlyAM', 'earlyPM']);
  });

  it('excludes occurrences before today or beyond the horizon', () => {
    const events = [ev({ id: 'soon', date: '2026-10-05' }), ev({ id: 'far', date: '2027-06-01' })];
    const items = upcomingOccurrences(events, '2026-10-01', 90, 30);
    expect(items.map((i) => i.event.id)).toEqual(['soon']);
  });
});
