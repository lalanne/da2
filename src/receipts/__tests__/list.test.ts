import { availableMonths, filterReceipts, mergeReceipts } from '../list';
import type { Receipt } from '../../models/Receipt';

function r(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r1',
    uploaderId: 'u1',
    storagePath: 'p',
    fileType: 'image',
    amount: 1000,
    currency: 'CLP',
    category: 'medical',
    expenseDate: '2026-09-01',
    note: null,
    childId: null,
    visibility: 'private',
    sharedAt: null,
    createdAt: 1,
    ...overrides,
  };
}

describe('mergeReceipts', () => {
  it('dedupes by id (a shared receipt of mine is in both queries) and sorts newest first', () => {
    const mine = [r({ id: 'a', createdAt: 3 }), r({ id: 'b', createdAt: 1, visibility: 'shared' })];
    const shared = [r({ id: 'b', createdAt: 1, visibility: 'shared' }), r({ id: 'c', createdAt: 2 })];
    expect(mergeReceipts(mine, shared).map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('filterReceipts', () => {
  const receipts = [
    r({ id: 'a', category: 'medical', expenseDate: '2026-09-10' }),
    r({ id: 'b', category: 'sports', expenseDate: '2026-09-20' }),
    r({ id: 'c', category: 'medical', expenseDate: '2026-08-05' }),
  ];
  it('filters by category and month independently', () => {
    expect(filterReceipts(receipts, { category: 'medical', month: null }).map((x) => x.id)).toEqual(['a', 'c']);
    expect(filterReceipts(receipts, { category: null, month: '2026-09' }).map((x) => x.id)).toEqual(['a', 'b']);
    expect(filterReceipts(receipts, { category: 'medical', month: '2026-09' }).map((x) => x.id)).toEqual(['a']);
    expect(filterReceipts(receipts, { category: null, month: null })).toHaveLength(3);
  });
});

describe('availableMonths', () => {
  it('returns distinct yyyy-mm newest first', () => {
    const receipts = [
      r({ expenseDate: '2026-09-10' }),
      r({ expenseDate: '2026-09-20' }),
      r({ expenseDate: '2026-08-05' }),
    ];
    expect(availableMonths(receipts)).toEqual(['2026-09', '2026-08']);
  });
});
