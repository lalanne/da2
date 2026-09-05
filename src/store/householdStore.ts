import { create } from 'zustand';
import type { AuthUser } from '../auth/AuthProvider';
import type { Household, NewHouseholdInput } from '../models/Household';
import type { UserProfile } from '../models/UserProfile';
import {
  householdRepository,
  type HouseholdRepository,
  type Unsubscribe,
} from '../data/householdRepository';
import { HouseholdError } from '../data/HouseholdError';
import { isValidInviteCode, normalizeInviteCode } from '../data/inviteCode';
import { strings } from '../i18n/strings';

export type HouseholdStatus = 'idle' | 'loading' | 'noHousehold' | 'active';

export interface HouseholdMember {
  uid: string;
  displayName: string | null;
  isYou: boolean;
}

interface HouseholdState {
  status: HouseholdStatus;
  profile: UserProfile | null;
  household: Household | null;
  members: HouseholdMember[];
  isSubmitting: boolean;
  actionError: string | null;

  start: (user: AuthUser) => void;
  stop: () => void;
  createHousehold: (input: NewHouseholdInput) => Promise<boolean>;
  joinHousehold: (rawCode: string) => Promise<boolean>;
  regenerateInviteCode: () => Promise<void>;
  clearActionError: () => void;
}

export function createHouseholdStore(repo: HouseholdRepository) {
  return create<HouseholdState>((set, get) => {
    let user: AuthUser | null = null;
    let profileUnsub: Unsubscribe | null = null;
    let householdUnsub: Unsubscribe | null = null;
    let subscribedHouseholdId: string | null = null;
    let repairing = false;

    async function resolveMembers(household: Household): Promise<void> {
      if (!user) return;
      const uid = user.uid;
      const displayName = user.displayName;
      const others = household.parentIds.filter((id) => id !== uid);
      const otherProfiles = await Promise.all(
        others.map((id) => repo.fetchProfile(id).catch(() => null)),
      );
      const members: HouseholdMember[] = household.parentIds.map((id) => {
        if (id === uid) return { uid: id, displayName, isYou: true };
        const p = otherProfiles[others.indexOf(id)];
        return { uid: id, displayName: p?.displayName ?? null, isYou: false };
      });
      set({ members });
    }

    function watchHousehold(householdId: string): void {
      if (subscribedHouseholdId === householdId) return;
      householdUnsub?.();
      subscribedHouseholdId = householdId;
      householdUnsub = repo.subscribeToHousehold(householdId, (household) => {
        if (!household) return;
        set({ household, status: 'active' });
        void resolveMembers(household);
        void repairMembership(household);
      });
    }

    async function repairMembership(household: Household): Promise<void> {
      const p = get().profile;
      if (!user || !p || repairing) return;
      if (household.parentIds.includes(user.uid)) return;
      if (!p.joinedVia) return;
      repairing = true;
      try {
        await repo.linkJoin(user.uid, p.joinedVia, household.id);
      } catch {
        // listener will retry on the next snapshot
      } finally {
        repairing = false;
      }
    }

    async function reconcile(profile: UserProfile | null): Promise<void> {
      if (!user) return;

      if (!profile) {
        set({ profile: null, status: 'loading' });
        return;
      }
      set({ profile });

      // Finish an interrupted join: code claimed, household not yet linked.
      if (profile.householdId == null && profile.joinedVia != null && !repairing) {
        repairing = true;
        try {
          const code = await repo.fetchInviteCode(profile.joinedVia);
          if (code && code.redeemedBy === user.uid) {
            await repo.linkJoin(user.uid, code.code, code.householdId);
            return; // the users/{uid} write re-triggers this listener
          }
        } catch {
          // fall through — user can retry from the join screen
        } finally {
          repairing = false;
        }
      }

      if (profile.householdId) {
        watchHousehold(profile.householdId);
      } else {
        householdUnsub?.();
        householdUnsub = null;
        subscribedHouseholdId = null;
        set({ status: 'noHousehold', household: null, members: [] });
      }
    }

    return {
      status: 'idle',
      profile: null,
      household: null,
      members: [],
      isSubmitting: false,
      actionError: null,

      start: (nextUser) => {
        if (user?.uid === nextUser.uid) return;
        get().stop();
        user = nextUser;
        set({ status: 'loading' });
        profileUnsub = repo.subscribeToProfile(nextUser.uid, (profile) => {
          void reconcile(profile);
        });
      },

      stop: () => {
        profileUnsub?.();
        householdUnsub?.();
        profileUnsub = null;
        householdUnsub = null;
        subscribedHouseholdId = null;
        user = null;
        repairing = false;
        set({
          status: 'idle',
          profile: null,
          household: null,
          members: [],
          isSubmitting: false,
          actionError: null,
        });
      },

      createHousehold: async (input) => {
        if (!user) return false;
        set({ isSubmitting: true, actionError: null });
        try {
          await repo.createHousehold(user, input);
          return true;
        } catch (error) {
          set({ actionError: messageFor(error, 'createFailed') });
          return false;
        } finally {
          set({ isSubmitting: false });
        }
      },

      joinHousehold: async (rawCode) => {
        if (!user) return false;
        const code = normalizeInviteCode(rawCode);
        if (!isValidInviteCode(code)) {
          set({ actionError: strings.household.join.errors.badFormat });
          return false;
        }
        set({ isSubmitting: true, actionError: null });
        try {
          const existing = await repo.fetchInviteCode(code);
          if (!existing) throw new HouseholdError('codeInvalid');
          if (existing.redeemedBy && existing.redeemedBy !== user.uid) {
            throw new HouseholdError('codeInvalid');
          }
          if (existing.redeemedBy !== user.uid) {
            await repo.claimInviteCode(user.uid, code);
          }
          await repo.linkJoin(user.uid, code, existing.householdId);
          return true;
        } catch (error) {
          set({ actionError: messageFor(error, 'joinFailed') });
          return false;
        } finally {
          set({ isSubmitting: false });
        }
      },

      regenerateInviteCode: async () => {
        const { household, profile } = get();
        if (!user || !household || !profile) return;
        if (household.parentIds.length !== 1 || !household.pendingInviteCode) return;
        set({ isSubmitting: true, actionError: null });
        try {
          await repo.regenerateInviteCode(
            user.uid,
            household.id,
            household.pendingInviteCode,
          );
        } catch (error) {
          set({ actionError: messageFor(error, 'joinFailed') });
        } finally {
          set({ isSubmitting: false });
        }
      },

      clearActionError: () => set({ actionError: null }),
    };
  });
}

function messageFor(error: unknown, fallbackKind: 'createFailed' | 'joinFailed'): string {
  if (error instanceof HouseholdError) return error.message;
  return new HouseholdError(fallbackKind).message;
}

export const useHouseholdStore = createHouseholdStore(householdRepository);
