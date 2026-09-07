import { strings } from '../../i18n/strings';
import type { EventType, KidEvent } from '../../models/Event';
import type { Household } from '../../models/Household';

export function eventTypeLabel(type: EventType): string {
  return strings.events.types[type];
}

export function childrenLabel(childIds: string[], household: Household): string {
  if (childIds.length === 0) return strings.events.forHousehold;
  const names = household.children
    .filter((c) => childIds.includes(c.id))
    .map((c) => c.name);
  return names.length ? strings.events.forChildren(names.join(', ')) : strings.events.forHousehold;
}

export function eventTimeLabel(event: KidEvent): string {
  if (event.allDay) return strings.events.allDay;
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime}`;
  if (event.startTime) return event.startTime;
  return strings.events.allDay;
}
