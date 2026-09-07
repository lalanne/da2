import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHouseholdStore } from '../store/householdStore';
import { useCustodyStore } from '../store/custodyStore';

/**
 * Keeps the custody store subscribed to the active household's proposals.
 * Mounted from the main screen (only reached when a household is active).
 */
export function useCustodySync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const householdId = useHouseholdStore((s) => s.household?.id);

  useEffect(() => {
    if (householdId && uid) {
      useCustodyStore.getState().start(householdId, uid);
    } else {
      useCustodyStore.getState().stop();
    }
    return () => useCustodyStore.getState().stop();
  }, [householdId, uid]);
}
