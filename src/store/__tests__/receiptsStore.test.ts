import { createReceiptsStore } from '../receiptsStore';
import type { ReceiptsRepository } from '../../data/receiptsRepository';
import type { NewReceiptInput, PickedFile, Receipt } from '../../models/Receipt';
import { strings } from '../../i18n/strings';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function makeRepo() {
  let mineCb: ((r: Receipt[]) => void) | undefined;
  let sharedCb: ((r: Receipt[]) => void) | undefined;
  const repo: ReceiptsRepository = {
    subscribeMine: jest.fn((_hid, _uid, cb) => {
      mineCb = cb;
      return jest.fn();
    }),
    subscribeShared: jest.fn((_hid, cb) => {
      sharedCb = cb;
      return jest.fn();
    }),
    uploadReceipt: jest.fn(async () => {}),
    shareReceipt: jest.fn(async () => {}),
    deleteReceipt: jest.fn(async () => {}),
    localFileUri: jest.fn(async () => 'file:///cache/r.jpg'),
  };
  return {
    repo,
    emitMine: (r: Receipt[]) => mineCb?.(r),
    emitShared: (r: Receipt[]) => sharedCb?.(r),
  };
}

const file: PickedFile = { uri: 'file:///tmp/r.jpg', fileType: 'image', size: 1000, mimeType: 'image/jpeg' };
const meta: NewReceiptInput = {
  amount: 12500,
  currency: 'CLP',
  tags: ['medical'],
  expenseDate: '2026-09-01',
  note: null,
  childId: null,
};

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r1',
    uploaderId: 'u1',
    storagePath: 'p',
    fileType: 'image',
    amount: 12500,
    currency: 'CLP',
    tags: ['medical'],
    expenseDate: '2026-09-01',
    note: null,
    childId: null,
    visibility: 'private',
    sharedAt: null,
    createdAt: 1,
    ...overrides,
  };
}

describe('receiptsStore', () => {
  it('becomes ready only after both listeners have fired once', async () => {
    const { repo, emitMine, emitShared } = makeRepo();
    const store = createReceiptsStore(repo);
    store.getState().start('h1', 'u1');
    expect(store.getState().status).toBe('loading');

    emitMine([]);
    await flush();
    expect(store.getState().status).toBe('loading');

    emitShared([]);
    await flush();
    expect(store.getState().status).toBe('ready');
  });

  it('all() merges and dedupes a receipt that is both mine and shared', async () => {
    const { repo, emitMine, emitShared } = makeRepo();
    const store = createReceiptsStore(repo);
    store.getState().start('h1', 'u1');
    emitMine([receipt({ id: 'a', createdAt: 2 }), receipt({ id: 'b', createdAt: 1, visibility: 'shared' })]);
    emitShared([receipt({ id: 'b', createdAt: 1, visibility: 'shared' })]);
    await flush();

    expect(store.getState().all().map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('upload / share / remove forward to the repo', async () => {
    const { repo } = makeRepo();
    const store = createReceiptsStore(repo);
    store.getState().start('h1', 'u1');

    await store.getState().upload(file, meta);
    expect(repo.uploadReceipt).toHaveBeenCalledWith('h1', 'u1', file, meta);

    await store.getState().share('r9');
    expect(repo.shareReceipt).toHaveBeenCalledWith('h1', 'r9');

    const r = receipt({ id: 'r9' });
    await store.getState().remove(r);
    expect(repo.deleteReceipt).toHaveBeenCalledWith('h1', r);
  });

  it('an upload failure leaves an error and reports false (no doc written by design)', async () => {
    const { repo } = makeRepo();
    (repo.uploadReceipt as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'storage/retry-limit-exceeded' }),
    );
    const store = createReceiptsStore(repo);
    store.getState().start('h1', 'u1');

    expect(await store.getState().upload(file, meta)).toBe(false);
    expect(store.getState().actionError).toBe(
      `${strings.receipts.errors.uploadFailed} [storage/retry-limit-exceeded]`,
    );
  });

  it('ignores a concurrent action', async () => {
    const { repo } = makeRepo();
    let release: () => void = () => {};
    (repo.uploadReceipt as jest.Mock).mockImplementation(
      () => new Promise<void>((r) => { release = () => r(); }),
    );
    const store = createReceiptsStore(repo);
    store.getState().start('h1', 'u1');

    const first = store.getState().upload(file, meta);
    const second = await store.getState().upload(file, meta);
    release();
    await first;

    expect(second).toBe(false);
    expect(repo.uploadReceipt).toHaveBeenCalledTimes(1);
  });
});
