import { create } from 'zustand';
import type {
  NewSettlementInput,
  NewSplitProposalInput,
  Settlement,
  SplitProposal,
} from '../models/Split';
import {
  splitRepository,
  type SplitRepository,
  type Unsubscribe,
} from '../data/splitRepository';
import { strings } from '../i18n/strings';

export type SplitStatus = 'idle' | 'loading' | 'ready';

interface SplitState {
  status: SplitStatus;
  proposals: SplitProposal[];
  settlements: Settlement[];
  isSubmitting: boolean;
  actionError: string | null;

  start: (householdId: string, uid: string) => void;
  stop: () => void;
  propose: (input: NewSplitProposalInput) => Promise<boolean>;
  resolveProposal: (proposalId: string, decision: 'approved' | 'rejected') => Promise<boolean>;
  cancelProposal: (proposalId: string) => Promise<boolean>;
  recordSettlement: (input: NewSettlementInput) => Promise<boolean>;
  resolveSettlement: (settlementId: string, decision: 'confirmed' | 'rejected') => Promise<boolean>;
  cancelSettlement: (settlementId: string) => Promise<boolean>;
  clearActionError: () => void;
}

export function createSplitStore(repo: SplitRepository) {
  return create<SplitState>((set, get) => {
    let householdId: string | null = null;
    let uid: string | null = null;
    let unsubProposals: Unsubscribe | null = null;
    let unsubSettlements: Unsubscribe | null = null;
    let gotProposals = false;
    let gotSettlements = false;

    function maybeReady() {
      if (gotProposals && gotSettlements) set({ status: 'ready' });
    }

    async function run(op: () => Promise<void>, fallback: string): Promise<boolean> {
      if (get().isSubmitting) return false;
      set({ isSubmitting: true, actionError: null });
      try {
        await op();
        return true;
      } catch (error) {
        console.warn('[split] action failed', error);
        const code = (error as { code?: string })?.code;
        set({ actionError: code ? `${fallback} [${code}]` : fallback });
        return false;
      } finally {
        set({ isSubmitting: false });
      }
    }

    return {
      status: 'idle',
      proposals: [],
      settlements: [],
      isSubmitting: false,
      actionError: null,

      start: (nextHouseholdId, nextUid) => {
        if (householdId === nextHouseholdId && uid === nextUid) return;
        get().stop();
        householdId = nextHouseholdId;
        uid = nextUid;
        gotProposals = false;
        gotSettlements = false;
        set({ status: 'loading' });
        unsubProposals = repo.subscribeSplitProposals(
          nextHouseholdId,
          (proposals) => {
            gotProposals = true;
            set({ proposals });
            maybeReady();
          },
          () => {},
        );
        unsubSettlements = repo.subscribeSettlements(
          nextHouseholdId,
          (settlements) => {
            gotSettlements = true;
            set({ settlements });
            maybeReady();
          },
          () => {},
        );
      },

      stop: () => {
        unsubProposals?.();
        unsubSettlements?.();
        unsubProposals = null;
        unsubSettlements = null;
        householdId = null;
        uid = null;
        set({
          status: 'idle',
          proposals: [],
          settlements: [],
          isSubmitting: false,
          actionError: null,
        });
      },

      propose: (input) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(() => repo.proposeSplit(hid, me, input), strings.split.errors.proposeFailed);
      },

      resolveProposal: (proposalId, decision) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.resolveSplitProposal(hid, proposalId, me, decision),
          strings.split.errors.resolveFailed,
        );
      },

      cancelProposal: (proposalId) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(
          () => repo.cancelSplitProposal(hid, proposalId),
          strings.split.errors.resolveFailed,
        );
      },

      recordSettlement: (input) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.recordSettlement(hid, me, input),
          strings.split.errors.settlementFailed,
        );
      },

      resolveSettlement: (settlementId, decision) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.resolveSettlement(hid, settlementId, me, decision),
          strings.split.errors.resolveFailed,
        );
      },

      cancelSettlement: (settlementId) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(
          () => repo.cancelSettlement(hid, settlementId),
          strings.split.errors.resolveFailed,
        );
      },

      clearActionError: () => set({ actionError: null }),
    };
  });
}

export const useSplitStore = createSplitStore(splitRepository);
