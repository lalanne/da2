import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHouseholdStore } from '../store/householdStore';
import { useSplitStore } from '../store/splitStore';

/** Keeps the split store subscribed to the active household (spec 010). */
export function useSplitSync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const householdId = useHouseholdStore((s) => s.household?.id);

  useEffect(() => {
    if (householdId && uid) {
      useSplitStore.getState().start(householdId, uid);
    } else {
      useSplitStore.getState().stop();
    }
    return () => useSplitStore.getState().stop();
  }, [householdId, uid]);
}
