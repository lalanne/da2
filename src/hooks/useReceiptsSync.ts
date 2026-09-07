import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useHouseholdStore } from '../store/householdStore';
import { useReceiptsStore } from '../store/receiptsStore';

/** Keeps the receipts store subscribed to the active household. */
export function useReceiptsSync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const householdId = useHouseholdStore((s) => s.household?.id);

  useEffect(() => {
    if (householdId && uid) {
      useReceiptsStore.getState().start(householdId, uid);
    } else {
      useReceiptsStore.getState().stop();
    }
    return () => useReceiptsStore.getState().stop();
  }, [householdId, uid]);
}
