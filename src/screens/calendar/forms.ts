import { strings } from '../../i18n/strings';
import { buildCycle, isHhMm, isIsoDate, minutesOfDay } from '../../custody';
import type {
  NewDayOverrideInput,
  NewPatternInput,
  PresetLabel,
} from '../../models/Custody';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function buildPatternInput(input: {
  preset: PresetLabel;
  startsWith: number;
  anchorDate: string;
  changeoverTime: string;
  effectiveFrom: string;
}): Result<NewPatternInput> {
  const e = strings.custody.patternSetup.errors;
  if (!isIsoDate(input.anchorDate) || !isIsoDate(input.effectiveFrom)) {
    return { ok: false, error: e.badDate };
  }
  if (!isHhMm(input.changeoverTime)) {
    return { ok: false, error: e.badTime };
  }
  if (input.effectiveFrom < input.anchorDate) {
    return { ok: false, error: e.effectiveBeforeAnchor };
  }
  const base = buildCycle(input.preset, input.anchorDate);
  const cycle = input.startsWith === 1 ? base.map((v) => 1 - v) : base;
  return {
    ok: true,
    value: {
      cycle,
      anchorDate: input.anchorDate,
      changeoverTime: input.changeoverTime,
      effectiveFrom: input.effectiveFrom,
      presetLabel: input.preset,
    },
  };
}

export function buildOverrideInput(input: {
  date: string;
  assignedTo: number;
  allDay: boolean;
  from: string;
  to: string;
}): Result<NewDayOverrideInput> {
  const e = strings.custody.proposeOverride.errors;
  if (input.allDay) {
    return {
      ok: true,
      value: { date: input.date, assignedTo: input.assignedTo, startTime: null, endTime: null },
    };
  }
  if ((input.from && !isHhMm(input.from)) || (input.to && !isHhMm(input.to))) {
    return { ok: false, error: e.badTime };
  }
  const startTime = input.from || null;
  const endTime = input.to || null;
  if (startTime && endTime && minutesOfDay(endTime) <= minutesOfDay(startTime)) {
    return { ok: false, error: e.order };
  }
  return {
    ok: true,
    value: { date: input.date, assignedTo: input.assignedTo, startTime, endTime },
  };
}
