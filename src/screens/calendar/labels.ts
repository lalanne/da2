import { strings } from '../../i18n/strings';
import { formatMinutes } from '../../custody';
import type { Proposal } from '../../models/Custody';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { parentName } from './parents';

/** "12 de septiembre" */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${strings.custody.months[m - 1]}`;
}

/** "septiembre 2026" */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return strings.custody.monthLabel(strings.custody.months[m - 1], y);
}

/** "sábado 12 de septiembre" */
export function weekdayDayLabel(iso: string): string {
  const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  // reuse weekday math without importing dates here
  const [y, mo, d] = iso.split('-').map(Number);
  const wd = (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() + 6) % 7;
  return `${days[wd]} ${dayLabel(iso)}`;
}

export function describeProposal(
  p: Proposal,
  household: Household,
  members: HouseholdMember[],
): string {
  if (p.type === 'pattern') {
    const preset = strings.custody.patternSetup.presets[p.presetLabel].name;
    return strings.custody.proposalSummary.pattern(preset, dayLabel(p.effectiveFrom));
  }
  const name = parentName(p.assignedTo, household, members);
  const when =
    p.startTime || p.endTime
      ? strings.custody.proposalSummary.timeRange(
          p.startTime ?? formatMinutes(0),
          p.endTime ?? formatMinutes(1440),
        )
      : strings.custody.day.allDay;
  return strings.custody.proposalSummary.dayOverride(dayLabel(p.date), name, when);
}
