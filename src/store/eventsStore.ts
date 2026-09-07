import { create } from 'zustand';
import type { KidEvent, NewEventInput } from '../models/Event';
import {
  eventsRepository,
  type EventsRepository,
  type Unsubscribe,
} from '../data/eventsRepository';
import { strings } from '../i18n/strings';

export type EventsStatus = 'idle' | 'loading' | 'ready';

interface EventsState {
  status: EventsStatus;
  events: KidEvent[];
  isSubmitting: boolean;
  actionError: string | null;

  start: (householdId: string, uid: string) => void;
  stop: () => void;
  create: (input: NewEventInput) => Promise<boolean>;
  update: (eventId: string, input: NewEventInput) => Promise<boolean>;
  remove: (eventId: string) => Promise<boolean>;
  clearActionError: () => void;
}

export function createEventsStore(repo: EventsRepository) {
  return create<EventsState>((set, get) => {
    let householdId: string | null = null;
    let uid: string | null = null;
    let unsub: Unsubscribe | null = null;

    async function run(op: () => Promise<void>, fallback: string): Promise<boolean> {
      if (get().isSubmitting) return false;
      set({ isSubmitting: true, actionError: null });
      try {
        await op();
        return true;
      } catch (error) {
        console.warn('[events] action failed', error);
        const code = (error as { code?: string })?.code;
        set({ actionError: code ? `${fallback} [${code}]` : fallback });
        return false;
      } finally {
        set({ isSubmitting: false });
      }
    }

    return {
      status: 'idle',
      events: [],
      isSubmitting: false,
      actionError: null,

      start: (nextHouseholdId, nextUid) => {
        if (householdId === nextHouseholdId && uid === nextUid) return;
        get().stop();
        householdId = nextHouseholdId;
        uid = nextUid;
        set({ status: 'loading' });
        unsub = repo.subscribeToEvents(
          nextHouseholdId,
          (events) => set({ events, status: 'ready' }),
          () => {
            // transient listener error — never fatal
          },
        );
      },

      stop: () => {
        unsub?.();
        unsub = null;
        householdId = null;
        uid = null;
        set({ status: 'idle', events: [], isSubmitting: false, actionError: null });
      },

      create: (input) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(() => repo.createEvent(hid, me, input), strings.events.errors.saveFailed);
      },

      update: (eventId, input) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.updateEvent(hid, eventId, me, input),
          strings.events.errors.saveFailed,
        );
      },

      remove: (eventId) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(() => repo.deleteEvent(hid, eventId), strings.events.errors.deleteFailed);
      },

      clearActionError: () => set({ actionError: null }),
    };
  });
}

export const useEventsStore = createEventsStore(eventsRepository);
