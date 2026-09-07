import { createCustodyStore } from '../custodyStore';
import type { CustodyRepository } from '../../data/custodyRepository';
import type { Proposal } from '../../models/Custody';
import { strings } from '../../i18n/strings';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeRepo() {
  let cb: ((p: Proposal[]) => void) | undefined;
  const repo: CustodyRepository = {
    subscribeToProposals: jest.fn((_hid, next) => {
      cb = next;
      return jest.fn();
    }),
    createPatternProposal: jest.fn(async () => {}),
    createDayOverrideProposal: jest.fn(async () => {}),
    resolveProposal: jest.fn(async () => {}),
    cancelProposal: jest.fn(async () => {}),
  };
  return { repo, emit: (p: Proposal[]) => cb?.(p) };
}

const patternInput = {
  cycle: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  anchorDate: '2026-09-07',
  changeoverTime: '18:00',
  effectiveFrom: '2026-09-07',
  presetLabel: 'alternating-weeks' as const,
};

describe('custodyStore', () => {
  it('subscribes on start and becomes ready on the first snapshot', async () => {
    const { repo, emit } = makeRepo();
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u1');
    expect(store.getState().status).toBe('loading');
    expect(repo.subscribeToProposals).toHaveBeenCalledWith('h1', expect.any(Function), expect.any(Function));

    emit([]);
    await flush();
    expect(store.getState().status).toBe('ready');
  });

  it('proposePattern forwards householdId + proposerId to the repo', async () => {
    const { repo } = makeRepo();
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u1');

    expect(await store.getState().proposePattern(patternInput)).toBe(true);
    expect(repo.createPatternProposal).toHaveBeenCalledWith('h1', 'u1', patternInput);
  });

  it('resolve and cancel forward correctly', async () => {
    const { repo } = makeRepo();
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u2');

    await store.getState().resolve('p1', 'approved');
    expect(repo.resolveProposal).toHaveBeenCalledWith('h1', 'p1', 'u2', 'approved');

    await store.getState().cancel('p2');
    expect(repo.cancelProposal).toHaveBeenCalledWith('h1', 'p2');
  });

  it('surfaces a repo failure with the error code', async () => {
    const { repo } = makeRepo();
    (repo.createPatternProposal as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'firestore/permission-denied' }),
    );
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u1');

    expect(await store.getState().proposePattern(patternInput)).toBe(false);
    expect(store.getState().actionError).toBe(
      `${strings.custody.errors.proposeFailed} [firestore/permission-denied]`,
    );
  });

  it('ignores a second action while one is in flight', async () => {
    const { repo } = makeRepo();
    let release: () => void = () => {};
    (repo.createDayOverrideProposal as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => { release = () => r(); }),
    );
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u1');

    const input = { date: '2026-09-12', assignedTo: 1, startTime: null, endTime: null };
    const first = store.getState().proposeDayOverride(input);
    const second = await store.getState().proposeDayOverride(input);
    release();
    await first;

    expect(second).toBe(false);
    expect(repo.createDayOverrideProposal).toHaveBeenCalledTimes(1);
  });

  it('tears down on stop', () => {
    const { repo } = makeRepo();
    const store = createCustodyStore(repo);
    store.getState().start('h1', 'u1');
    store.getState().stop();
    expect(store.getState().status).toBe('idle');
    expect(store.getState().proposals).toEqual([]);
  });
});
