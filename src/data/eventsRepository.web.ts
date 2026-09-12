import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { webApp } from './firebaseWebApp';
import type { EventType, KidEvent, NewEventInput } from '../models/Event';
import type { EventsRepository } from './eventsRepository';

function db() {
  return getFirestore(webApp());
}

function eventsCollection(householdId: string) {
  return collection(db(), 'households', householdId, 'events');
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === 'number' ? value : 0;
}

function mapEvent(id: string, data: Record<string, unknown>): KidEvent {
  const rec = data.recurrence as { freq?: string; until?: string } | null | undefined;
  return {
    id,
    title: String(data.title ?? ''),
    type: (data.type as EventType) ?? 'other',
    childIds: Array.isArray(data.childIds)
      ? (data.childIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [],
    date: String(data.date ?? ''),
    allDay: data.allDay === true,
    startTime: (data.startTime as string | null) ?? null,
    endTime: (data.endTime as string | null) ?? null,
    location: (data.location as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    recurrence:
      rec && rec.freq === 'weekly' && typeof rec.until === 'string'
        ? { freq: 'weekly', until: rec.until }
        : null,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toMillis(data.createdAt),
    updatedBy: String(data.updatedBy ?? data.createdBy ?? ''),
    updatedAt: toMillis(data.updatedAt ?? data.createdAt),
  };
}

function payload(input: NewEventInput) {
  return {
    title: input.title,
    type: input.type,
    childIds: input.childIds,
    date: input.date,
    allDay: input.allDay,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    notes: input.notes,
    recurrence: input.recurrence,
  };
}

export const eventsRepository: EventsRepository = {
  subscribeToEvents(householdId, cb, onError) {
    return onSnapshot(
      query(eventsCollection(householdId), orderBy('date', 'asc')),
      (snap) => {
        const out: KidEvent[] = [];
        snap.forEach((docSnap) => {
          out.push(mapEvent(docSnap.id, docSnap.data() as Record<string, unknown>));
        });
        cb(out);
      },
      (error: unknown) => onError?.(error),
    );
  },

  async createEvent(householdId, uid, input) {
    await addDoc(eventsCollection(householdId), {
      ...payload(input),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  },

  async updateEvent(householdId, eventId, uid, input) {
    await updateDoc(doc(eventsCollection(householdId), eventId), {
      ...payload(input),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteEvent(householdId, eventId) {
    await deleteDoc(doc(eventsCollection(householdId), eventId));
  },
};
