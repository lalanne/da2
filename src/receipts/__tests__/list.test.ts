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

describe('mergeReceipts', () => {
  it('dedupes by id (a shared receipt of mine is in both queries) and sorts newest first', () => {
    const mine = [r({ id: 'a', createdAt: 3 }), r({ id: 'b', createdAt: 1, visibility: 'shared' })];
    const shared = [r({ id: 'b', createdAt: 1, visibility: 'shared' }), r({ id: 'c', createdAt: 2 })];
    expect(mergeReceipts(mine, shared).map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('filterReceipts', () => {
  const receipts = [
    r({ id: 'a', tags: ['tuition', 'sports'], expenseDate: '2026-09-10' }),
    r({ id: 'b', tags: ['sports'], expenseDate: '2026-09-20' }),
    r({ id: 'c', tags: ['medical'], expenseDate: '2026-08-05' }),
    r({ id: 'd', tags: [], expenseDate: '2026-09-25' }),
  ];

  it('null tag = all receipts', () => {
    expect(filterReceipts(receipts, { tag: null, month: null })).toHaveLength(4);
  });

  it('a tag matches every receipt that carries it (multi-tag receipts count under each)', () => {
    expect(filterReceipts(receipts, { tag: 'sports', month: null }).map((x) => x.id)).toEqual(['a', 'b']);
    expect(filterReceipts(receipts, { tag: 'tuition', month: null }).map((x) => x.id)).toEqual(['a']);
  });

  it("'none' matches only untagged receipts", () => {
    expect(filterReceipts(receipts, { tag: 'none', month: null }).map((x) => x.id)).toEqual(['d']);
  });

  it('tag and month filters compose (AND)', () => {
    expect(filterReceipts(receipts, { tag: 'sports', month: '2026-09' }).map((x) => x.id)).toEqual(['a', 'b']);
    expect(filterReceipts(receipts, { tag: 'medical', month: '2026-09' })).toHaveLength(0);
    expect(filterReceipts(receipts, { tag: null, month: '2026-08' }).map((x) => x.id)).toEqual(['c']);
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
