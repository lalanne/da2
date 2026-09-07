export type EventType =
  | 'doctor'
  | 'birthday'
  | 'tournament'
  | 'training'
  | 'school'
  | 'other';

export const EVENT_TYPES: EventType[] = [
  'doctor',
  'birthday',
  'tournament',
  'training',
  'school',
  'other',
];

export interface WeeklyRecurrence {
  freq: 'weekly';
  /** yyyy-mm-dd, inclusive. */
  until: string;
}

export interface KidEvent {
  id: string;
  title: string;
  type: EventType;
  /** ids from households/{hid}.children; empty = concerns the household. */
  childIds: string[];
  /** yyyy-mm-dd — the first (or only) occurrence. */
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  /** Only ever set when type === 'training'. */
  recurrence: WeeklyRecurrence | null;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
}

export interface NewEventInput {
  title: string;
  type: EventType;
  childIds: string[];
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  recurrence: WeeklyRecurrence | null;
}
