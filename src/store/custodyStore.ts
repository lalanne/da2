import { create } from 'zustand';
import type {
  NewDayOverrideInput,
  NewPatternInput,
  Proposal,
} from '../models/Custody';
import {
  custodyRepository,
  type CustodyRepository,
  type Unsubscribe,
} from '../data/custodyRepository';
import { strings } from '../i18n/strings';

export type CustodyStatus = 'idle' | 'loading' | 'ready';

interface CustodyState {
  status: CustodyStatus;
  proposals: Proposal[];
  isSubmitting: boolean;
  actionError: string | null;

  start: (householdId: string, uid: string) => void;
  stop: () => void;
  /** `solo`: the caller's household currently has one parent (spec 015) —
   *  the proposal self-approves instead of waiting on a co-parent. */
  proposePattern: (input: NewPatternInput, solo: boolean) => Promise<boolean>;
  proposeDayOverride: (input: NewDayOverrideInput, solo: boolean) => Promise<boolean>;
  resolve: (proposalId: string, decision: 'approved' | 'rejected') => Promise<boolean>;
  cancel: (proposalId: string) => Promise<boolean>;
  /** Spec 015 — a newly-joined co-parent accepts a unilateral decision. */
  acknowledge: (proposalId: string) => Promise<boolean>;
  clearActionError: () => void;
}

export function createCustodyStore(repo: CustodyRepository) {
  return create<CustodyState>((set, get) => {
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
        console.warn('[custody] action failed', error);
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
      isSubmitting: false,
      actionError: null,

      start: (nextHouseholdId, nextUid) => {
        if (householdId === nextHouseholdId && uid === nextUid) return;
        get().stop();
        householdId = nextHouseholdId;
        uid = nextUid;
        set({ status: 'loading' });
        unsub = repo.subscribeToProposals(
          nextHouseholdId,
          (proposals) => set({ proposals, status: 'ready' }),
          () => {
            // Transient listener error — the membership read can briefly lag.
            // Never let it surface as an unhandled (fatal) error.
          },
        );
      },

      stop: () => {
        unsub?.();
        unsub = null;
        householdId = null;
        uid = null;
        set({ status: 'idle', proposals: [], isSubmitting: false, actionError: null });
      },

      proposePattern: (input, solo) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.createPatternProposal(hid, me, input, solo),
          strings.custody.errors.proposeFailed,
        );
      },

      proposeDayOverride: (input, solo) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.createDayOverrideProposal(hid, me, input, solo),
          strings.custody.errors.proposeFailed,
        );
      },

      resolve: (proposalId, decision) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.resolveProposal(hid, proposalId, me, decision),
          strings.custody.errors.resolveFailed,
        );
      },

      cancel: (proposalId) => {
        if (!householdId) return Promise.resolve(false);
        const hid = householdId;
        return run(
          () => repo.cancelProposal(hid, proposalId),
          strings.custody.errors.resolveFailed,
        );
      },

      acknowledge: (proposalId) => {
        if (!householdId || !uid) return Promise.resolve(false);
        const hid = householdId;
        const me = uid;
        return run(
          () => repo.acknowledgeProposal(hid, proposalId, me),
          strings.custody.errors.resolveFailed,
        );
      },

      clearActionError: () => set({ actionError: null }),
    };
  });
}

export const useCustodyStore = createCustodyStore(custodyRepository);
