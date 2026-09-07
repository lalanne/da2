import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHouseholdStore } from '../store/householdStore';
import { useEventsStore } from '../store/eventsStore';

/** Keeps the events store subscribed to the active household's events. */
export function useEventsSync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const householdId = useHouseholdStore((s) => s.household?.id);

  useEffect(() => {
    if (householdId && uid) {
      useEventsStore.getState().start(householdId, uid);
    } else {
      useEventsStore.getState().stop();
    }
    return () => useEventsStore.getState().stop();
  }, [householdId, uid]);
}
