import { create } from 'zustand';
import type { NewReceiptInput, PickedFile, Receipt } from '../models/Receipt';
import {
  receiptsRepository,
  type ReceiptsRepository,
  type Unsubscribe,
} from '../data/receiptsRepository';
import { mergeReceipts } from '../receipts';
import { strings } from '../i18n/strings';

export type ReceiptsStatus = 'idle' | 'loading' | 'ready';

interface ReceiptsState {
  status: ReceiptsStatus;
  mine: Receipt[];
  shared: Receipt[];
  isSubmitting: boolean;
  actionError: string | null;

  start: (householdId: string, uid: string) => void;
  stop: () => void;
  upload: (file: PickedFile, meta: NewReceiptInput) => Promise<boolean>;
  share: (receiptId: string) => Promise<boolean>;
  remove: (receipt: Receipt) => Promise<boolean>;
  clearActionError: () => void;
  /** All receipts (mine + shared), deduped, newest first. */
  all: () => Receipt[];
}

export function createReceiptsStore(repo: ReceiptsRepository) {
  return create<ReceiptsState>((set, get) => {
    let householdId: string | null = null;
    let uid: string | null = null;
    let unsubMine: Unsubscribe | null = null;
    let unsubShared: Unsubscribe | null = null;
    let gotMine = false;
    let gotShared = false;

    function maybeReady() {
      if (gotMine && gotShared) set({ status: 'ready' });
    }

    async function run(op: () => Promise<void>, fallback: string): Promise<boolean> {
      if (get().isSubmitting) return false;
      set({ isSubmitting: true, actionError: null });
      try {
        await op();
        return true;
      } catch (error) {
        console.warn('[receipts] action failed', error);
        const code = (error as { code?: string })?.code;
        set({ actionError: code ? `${fallback} [${code}]` : fallback });
        return false;
      } finally {
        set({ isSubmitting: false });
      }
    }

    return {
      status: 'idle',
      mine: [],
      shared: [],
      isSubmitting: false,
      actionError: null,

      start: (nextHouseholdId, nextUid) => {
        if (householdId === nextHouseholdId && uid === nextUid) return;
        get().stop();
        householdId = nextHouseholdId;
        uid = nextUid;
        gotMine = false;
        gotShared = false;
        set({ status: 'loading' });
        unsubMine = repo.subscribeMine(
          nextHouseholdId,
          nextUid,
          (mine) => {
            gotMine = true;
            set({ mine });
            maybeReady();
          },
          () => {},
        );
        unsubShared = repo.subscribeShared(
          nextHouseholdId,
          (shared) => {
            gotShared = true;
            set({ shared });
            maybeReady();
          },
          () => {},
        );
      },

      stop: () => {
        unsubMine?.();
        unsubShared?.();
        unsubMine = null;
        unsubShared = null;
        householdId = null;
        uid = null;
        set({ status: 'idle', mine: [], shared: [], isSubmitting: false, actionError: null });
      },

      upload: (file, meta) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.uploadReceipt(hid, me, file, meta),
          strings.receipts.errors.uploadFailed,
        );
      },

      share: (receiptId) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(() => repo.shareReceipt(hid, receiptId), strings.receipts.errors.shareFailed);
      },

      remove: (receipt) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(() => repo.deleteReceipt(hid, receipt), strings.receipts.errors.deleteFailed);
      },

      clearActionError: () => set({ actionError: null }),

      all: () => mergeReceipts(get().mine, get().shared),
    };
  });
}

export const useReceiptsStore = createReceiptsStore(receiptsRepository);
