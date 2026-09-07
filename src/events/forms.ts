import { strings } from '../i18n/strings';
import { isHhMm, isIsoDate, minutesOfDay } from '../custody/dates';
import type { EventType, NewEventInput } from '../models/Event';

type Result = { ok: true; value: NewEventInput } | { ok: false; error: string };

export interface EventFormState {
  title: string;
  type: EventType;
  childIds: string[];
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  repeats: boolean;
  until: string;
}

export function buildEventInput(f: EventFormState): Result {
  const e = strings.events.form.errors;

  if (!f.title.trim()) return { ok: false, error: e.missingTitle };
  if (!isIsoDate(f.date)) return { ok: false, error: e.badDate };

  let startTime: string | null = null;
  let endTime: string | null = null;
  if (!f.allDay) {
    if ((f.startTime && !isHhMm(f.startTime)) || (f.endTime && !isHhMm(f.endTime))) {
      return { ok: false, error: e.badTime };
    }
    startTime = f.startTime || null;
    endTime = f.endTime || null;
    if (startTime && endTime && minutesOfDay(endTime) <= minutesOfDay(startTime)) {
      return { ok: false, error: e.timeOrder };
    }
  }

  let recurrence: NewEventInput['recurrence'] = null;
  if (f.repeats) {
    if (f.type !== 'training') return { ok: false, error: e.recurrenceType };
    if (!isIsoDate(f.until)) return { ok: false, error: e.badDate };
    if (f.until < f.date) return { ok: false, error: e.untilBeforeDate };
    recurrence = { freq: 'weekly', until: f.until };
  }

  return {
    ok: true,
    value: {
      title: f.title.trim(),
      type: f.type,
      childIds: f.childIds,
      date: f.date,
      allDay: f.allDay,
      startTime,
      endTime,
      location: f.location.trim() || null,
      notes: f.notes.trim() || null,
      recurrence,
    },
  };
}
