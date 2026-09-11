import { createSplitStore } from '../splitStore';
import type { SplitRepository } from '../../data/splitRepository';
import type { Settlement, SplitProposal } from '../../models/Split';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeRepo() {
  let proposalsCb: ((p: SplitProposal[]) => void) | undefined;
  let settlementsCb: ((s: Settlement[]) => void) | undefined;
  const repo: SplitRepository = {
    subscribeSplitProposals: jest.fn((_hid, cb) => {
      proposalsCb = cb;
      return jest.fn();
    }),
    subscribeSettlements: jest.fn((_hid, cb) => {
      settlementsCb = cb;
      return jest.fn();
    }),
    proposeSplit: jest.fn(async () => {}),
    resolveSplitProposal: jest.fn(async () => {}),
    cancelSplitProposal: jest.fn(async () => {}),
    recordSettlement: jest.fn(async () => {}),
    resolveSettlement: jest.fn(async () => {}),
    cancelSettlement: jest.fn(async () => {}),
  };
  return {
    repo,
    emitProposals: (p: SplitProposal[]) => proposalsCb?.(p),
    emitSettlements: (s: Settlement[]) => settlementsCb?.(s),
  };
}

describe('splitStore', () => {
  it('is ready only after both listeners fire once', async () => {
    const { repo, emitProposals, emitSettlements } = makeRepo();
    const store = createSplitStore(repo);
    store.getState().start('h1', 'u1');
    expect(store.getState().status).toBe('loading');
    emitProposals([]);
    await flush();
    expect(store.getState().status).toBe('loading');
    emitSettlements([]);
    await flush();
    expect(store.getState().status).toBe('ready');
  });

  it('forwards every action to the repo', async () => {
    const { repo } = makeRepo();
    const store = createSplitStore(repo);
    store.getState().start('h1', 'u1');

    await store.getState().propose({ defaultPercentA: 40, overrides: { medical: 50 } });
    expect(repo.proposeSplit).toHaveBeenCalledWith('h1', 'u1', {
      defaultPercentA: 40,
      overrides: { medical: 50 },
    });

    await store.getState().resolveProposal('p1', 'approved');
    expect(repo.resolveSplitProposal).toHaveBeenCalledWith('h1', 'p1', 'u1', 'approved');

    await store.getState().cancelProposal('p1');
    expect(repo.cancelSplitProposal).toHaveBeenCalledWith('h1', 'p1');

    await store.getState().recordSettlement({
      payerUid: 'u1',
      payeeUid: 'u2',
      amount: 1000,
      currency: 'CLP',
      note: null,
    });
    expect(repo.recordSettlement).toHaveBeenCalledWith('h1', 'u1', {
      payerUid: 'u1',
      payeeUid: 'u2',
      amount: 1000,
      currency: 'CLP',
      note: null,
    });

    await store.getState().resolveSettlement('s1', 'confirmed');
    expect(repo.resolveSettlement).toHaveBeenCalledWith('h1', 's1', 'u1', 'confirmed');
  });

  it('ignores a concurrent action', async () => {
    const { repo } = makeRepo();
    let release: () => void = () => {};
    (repo.proposeSplit as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => { release = () => r(); }),
    );
    const store = createSplitStore(repo);
    store.getState().start('h1', 'u1');

    const first = store.getState().propose({ defaultPercentA: 50, overrides: {} });
    const second = await store.getState().propose({ defaultPercentA: 50, overrides: {} });
    release();
    await first;

    expect(second).toBe(false);
    expect(repo.proposeSplit).toHaveBeenCalledTimes(1);
  });
});
