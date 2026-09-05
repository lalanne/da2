import { createHouseholdStore } from '../householdStore';
import type { HouseholdRepository } from '../../data/householdRepository';
import type { AuthUser } from '../../auth/AuthProvider';
import type { Household } from '../../models/Household';
import type { UserProfile } from '../../models/UserProfile';
import { strings } from '../../i18n/strings';

const me: AuthUser = {
  uid: 'u1',
  displayName: 'Javiera',
  email: 'javi@example.com',
  photoUrl: null,
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'u1',
    displayName: 'Javiera',
    email: 'javi@example.com',
    photoUrl: null,
    householdId: null,
    joinedVia: null,
    createdAt: 0,
    ...overrides,
  };
}

function household(overrides: Partial<Household> = {}): Household {
  return {
    id: 'h1',
    name: 'Los García',
    parentIds: ['u1'],
    children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
    pendingInviteCode: 'ABCD2345',
    createdBy: 'u1',
    createdAt: 0,
    ...overrides,
  };
}

function makeRepo() {
  let profileCb: ((p: UserProfile | null) => void) | undefined;
  let householdCb: ((h: Household | null) => void) | undefined;
  const profileUnsub = jest.fn();
  const householdUnsub = jest.fn();

  const repo: HouseholdRepository = {
    subscribeToProfile: jest.fn((_uid, cb) => {
      profileCb = cb;
      return profileUnsub;
    }),
    subscribeToHousehold: jest.fn((_id, cb) => {
      householdCb = cb;
      return householdUnsub;
    }),
    fetchProfile: jest.fn(async () => null),
    fetchInviteCode: jest.fn(async () => null),
    createHousehold: jest.fn(async () => {}),
    claimInviteCode: jest.fn(async () => {}),
    linkJoin: jest.fn(async () => {}),
    regenerateInviteCode: jest.fn(async () => 'NEWCODE2'),
  };

  return {
    repo,
    profileUnsub,
    householdUnsub,
    emitProfile: (p: UserProfile | null) => profileCb?.(p),
    emitHousehold: (h: Household | null) => householdCb?.(h),
  };
}

describe('householdStore', () => {
  it('starts in loading and moves to noHousehold once the profile has no householdId', async () => {
    const { repo, emitProfile } = makeRepo();
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    expect(useStore.getState().status).toBe('loading');

    emitProfile(profile());
    await flush();

    expect(useStore.getState().status).toBe('noHousehold');
  });

  it('subscribes to the household and goes active when the profile has a householdId', async () => {
    const { repo, emitProfile, emitHousehold } = makeRepo();
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1' }));
    await flush();

    expect(repo.subscribeToHousehold).toHaveBeenCalledWith('h1', expect.any(Function));

    emitHousehold(household());
    await flush();

    expect(useStore.getState().status).toBe('active');
    expect(useStore.getState().household?.id).toBe('h1');
    expect(useStore.getState().members).toEqual([
      { uid: 'u1', displayName: 'Javiera', isYou: true },
    ]);
  });

  it('resolves the co-parent display name from their profile', async () => {
    const { repo, emitProfile, emitHousehold } = makeRepo();
    (repo.fetchProfile as jest.Mock).mockResolvedValue(profile({ uid: 'u2', displayName: 'Cristián' }));
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1' }));
    await flush();
    emitHousehold(household({ parentIds: ['u1', 'u2'], pendingInviteCode: null }));
    await flush();

    expect(useStore.getState().members).toEqual([
      { uid: 'u1', displayName: 'Javiera', isYou: true },
      { uid: 'u2', displayName: 'Cristián', isYou: false },
    ]);
  });

  it('ignores a second createHousehold while one is in flight', async () => {
    const { repo } = makeRepo();
    let resolveCreate: () => void = () => {};
    (repo.createHousehold as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => { resolveCreate = () => r(); }),
    );
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    const input = { name: 'Los García', children: [{ name: 'Sofía', birthdate: null }] };
    const first = useStore.getState().createHousehold(input);
    const second = await useStore.getState().createHousehold(input);
    resolveCreate();
    await first;

    expect(second).toBe(false);
    expect(repo.createHousehold).toHaveBeenCalledTimes(1);
  });

  it('refuses to create a household when the profile already has one', async () => {
    const { repo, emitProfile } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1' }));
    await flush();

    expect(await useStore.getState().createHousehold({ name: 'X', children: [{ name: 'S', birthdate: null }] })).toBe(false);
    expect(repo.createHousehold).not.toHaveBeenCalled();
  });

  it('keeps the active household through a transient empty/stale snapshot', async () => {
    const { repo, emitProfile, emitHousehold } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1' }));
    await flush();
    emitHousehold(household());
    await flush();
    expect(useStore.getState().status).toBe('active');

    emitProfile(null);
    await flush();
    expect(useStore.getState().status).toBe('active');
    expect(useStore.getState().household?.id).toBe('h1');

    emitProfile(profile({ householdId: null }));
    await flush();
    expect(useStore.getState().status).toBe('active');
    expect(useStore.getState().household?.id).toBe('h1');
  });

  it('holds an activating spinner after create and never falls back to onboarding', async () => {
    const { repo, emitProfile } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);
    emitProfile(profile()); // no household yet -> noHousehold
    await flush();
    expect(useStore.getState().status).toBe('noHousehold');

    const input = { name: 'Los García', children: [{ name: 'Sofía', birthdate: null }] };
    expect(await useStore.getState().createHousehold(input)).toBe(true);
    expect(useStore.getState().status).toBe('activating');

    // Firestore round-trips lag: a stale "no household" snapshot arrives.
    emitProfile(profile({ householdId: null }));
    await flush();
    expect(useStore.getState().status).toBe('activating');

    // A second create attempt in this window must be refused.
    expect(await useStore.getState().createHousehold(input)).toBe(false);
    expect(repo.createHousehold).toHaveBeenCalledTimes(1);

    // Then the real profile + household snapshots land.
    emitProfile(profile({ householdId: 'h1' }));
    await flush();
    (repo.subscribeToHousehold as jest.Mock).mock.calls.at(-1)?.[1](household());
    await flush();
    expect(useStore.getState().status).toBe('active');
  });

  it('createHousehold forwards to the repository and reports success', async () => {
    const { repo } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    const input = { name: 'Los García', children: [{ name: 'Sofía', birthdate: null }] };
    const ok = await useStore.getState().createHousehold(input);

    expect(ok).toBe(true);
    expect(repo.createHousehold).toHaveBeenCalledWith(me, input);
    expect(useStore.getState().isSubmitting).toBe(false);
  });

  it('rejects a badly formatted code without touching the repository', async () => {
    const { repo } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    const ok = await useStore.getState().joinHousehold('nope');

    expect(ok).toBe(false);
    expect(useStore.getState().actionError).toBe(strings.household.join.errors.badFormat);
    expect(repo.fetchInviteCode).not.toHaveBeenCalled();
  });

  it('errors on an unknown or already-redeemed code', async () => {
    const { repo } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    (repo.fetchInviteCode as jest.Mock).mockResolvedValueOnce(null);
    expect(await useStore.getState().joinHousehold('ABCD2345')).toBe(false);
    expect(useStore.getState().actionError).toBe(strings.household.join.errors.invalid);

    (repo.fetchInviteCode as jest.Mock).mockResolvedValueOnce({
      code: 'ABCD2345',
      householdId: 'h9',
      createdBy: 'u9',
      createdAt: 0,
      redeemedBy: 'someone-else',
    });
    expect(await useStore.getState().joinHousehold('ABCD2345')).toBe(false);
    expect(repo.claimInviteCode).not.toHaveBeenCalled();
  });

  it('claims then links a fresh code', async () => {
    const { repo } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    (repo.fetchInviteCode as jest.Mock).mockResolvedValueOnce({
      code: 'ABCD2345',
      householdId: 'h2',
      createdBy: 'u2',
      createdAt: 0,
      redeemedBy: null,
    });

    const ok = await useStore.getState().joinHousehold('abcd-2345');

    expect(ok).toBe(true);
    expect(repo.claimInviteCode).toHaveBeenCalledWith('u1', 'ABCD2345');
    expect(repo.linkJoin).toHaveBeenCalledWith('u1', 'ABCD2345', 'h2');
  });

  it('skips the claim step when the code is already redeemed by me (resume)', async () => {
    const { repo } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    (repo.fetchInviteCode as jest.Mock).mockResolvedValueOnce({
      code: 'ABCD2345',
      householdId: 'h2',
      createdBy: 'u2',
      createdAt: 0,
      redeemedBy: 'u1',
    });

    const ok = await useStore.getState().joinHousehold('ABCD2345');

    expect(ok).toBe(true);
    expect(repo.claimInviteCode).not.toHaveBeenCalled();
    expect(repo.linkJoin).toHaveBeenCalledWith('u1', 'ABCD2345', 'h2');
  });

  it('finishes an interrupted join on the next profile snapshot', async () => {
    const { repo, emitProfile } = makeRepo();
    (repo.fetchInviteCode as jest.Mock).mockResolvedValue({
      code: 'ABCD2345',
      householdId: 'h3',
      createdBy: 'u2',
      createdAt: 0,
      redeemedBy: 'u1',
    });
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    emitProfile(profile({ householdId: null, joinedVia: 'ABCD2345' }));
    await flush();

    expect(repo.linkJoin).toHaveBeenCalledWith('u1', 'ABCD2345', 'h3');
  });

  it('repairs missing household membership when the household snapshot lacks me', async () => {
    const { repo, emitProfile, emitHousehold } = makeRepo();
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1', joinedVia: 'ABCD2345' }));
    await flush();
    emitHousehold(household({ parentIds: ['u2'] }));
    await flush();

    expect(repo.linkJoin).toHaveBeenCalledWith('u1', 'ABCD2345', 'h1');
  });

  it('regenerates the code only while there is a single parent', async () => {
    const { repo, emitProfile, emitHousehold } = makeRepo();
    const useStore = createHouseholdStore(repo);
    useStore.getState().start(me);

    emitProfile(profile({ householdId: 'h1' }));
    await flush();
    emitHousehold(household({ parentIds: ['u1', 'u2'], pendingInviteCode: null }));
    await flush();
    await useStore.getState().regenerateInviteCode();
    expect(repo.regenerateInviteCode).not.toHaveBeenCalled();

    emitHousehold(household({ parentIds: ['u1'], pendingInviteCode: 'ABCD2345' }));
    await flush();
    await useStore.getState().regenerateInviteCode();
    expect(repo.regenerateInviteCode).toHaveBeenCalledWith('u1', 'h1', 'ABCD2345');
  });

  it('tears down subscriptions on stop', async () => {
    const { repo, profileUnsub, emitProfile, emitHousehold, householdUnsub } = makeRepo();
    const useStore = createHouseholdStore(repo);

    useStore.getState().start(me);
    emitProfile(profile({ householdId: 'h1' }));
    await flush();
    emitHousehold(household());
    await flush();

    useStore.getState().stop();

    expect(profileUnsub).toHaveBeenCalled();
    expect(householdUnsub).toHaveBeenCalled();
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().household).toBeNull();
  });
});
