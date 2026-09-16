import { computeBalanceSegments, isSoloReceipt, isSoloSettlement } from '../segments';
import { computeBalance } from '../../split/shares';
import { ABSENT_CO_PARENT } from '../../models/Household';
import type { Receipt } from '../../models/Receipt';
import type { Settlement } from '../../models/Split';

const A = 'parent-a';
const B = 'parent-b';
const JOINED_AT = 1000;

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r1',
    uploaderId: A,
    storagePath: 'p',
    fileType: 'image',
    amount: 10000,
    currency: 'CLP',
    tags: [],
    expenseDate: '2026-09-01',
    note: null,
    childId: null,
    visibility: 'shared',
    sharedAt: 500,
    splitPercentA: 50,
    createdAt: 1,
    ...over,
  };
}

function settlement(over: Partial<Settlement> = {}): Settlement {
  return {
    id: 's1',
    recordedBy: A,
    status: 'confirmed',
    payerUid: B,
    payeeUid: A,
    amount: 1000,
    currency: 'CLP',
    note: null,
    createdAt: 1,
    resolvedAt: 2,
    resolvedBy: B,
    ...over,
  };
}

describe('isSoloSettlement', () => {
  it('detects the sentinel on either side', () => {
    expect(isSoloSettlement(settlement({ payerUid: ABSENT_CO_PARENT }))).toBe(true);
    expect(isSoloSettlement(settlement({ payeeUid: ABSENT_CO_PARENT }))).toBe(true);
  });

  it('is false for a settlement between two real parents', () => {
    expect(isSoloSettlement(settlement())).toBe(false);
  });
});

describe('isSoloReceipt', () => {
  it('is true when shared before the co-parent joined', () => {
    expect(isSoloReceipt(receipt({ sharedAt: 500 }), JOINED_AT)).toBe(true);
  });

  it('is false when shared after the join', () => {
    expect(isSoloReceipt(receipt({ sharedAt: 1500 }), JOINED_AT)).toBe(false);
  });

  it('is false when never shared, or when there was no join', () => {
    expect(isSoloReceipt(receipt({ sharedAt: null }), JOINED_AT)).toBe(false);
    expect(isSoloReceipt(receipt({ sharedAt: 500 }), null)).toBe(false);
  });
});

describe('computeBalanceSegments', () => {
  it('returns a single segment while still solo (no join recorded)', () => {
    const segments = computeBalanceSegments(
      [receipt()],
      [settlement({ payerUid: ABSENT_CO_PARENT, payeeUid: A })],
      [A, ABSENT_CO_PARENT],
      null,
    );
    expect(segments.solo).toBeNull();
    expect(segments.agreed).toBeDefined();
  });

  it('returns a single segment for a household that never ran solo', () => {
    // The pilot's case: two parents, nothing recorded before a join boundary.
    const segments = computeBalanceSegments(
      [receipt({ sharedAt: 1500 })],
      [settlement()],
      [A, B],
      JOINED_AT,
    );
    expect(segments.solo).toBeNull();
  });

  it('splits the ledger once there is solo-period activity', () => {
    const soloReceipt = receipt({ id: 'solo-r', sharedAt: 500, amount: 10000, splitPercentA: 50 });
    const agreedReceipt = receipt({ id: 'agreed-r', sharedAt: 1500, amount: 20000, splitPercentA: 50 });

    const segments = computeBalanceSegments(
      [soloReceipt, agreedReceipt],
      [],
      [A, B],
      JOINED_AT,
    );

    // A uploaded both; the other side owes their half of each, separately.
    expect(segments.solo?.netAOwesB).toBe(-5000);
    expect(segments.agreed.netAOwesB).toBe(-10000);
  });

  it('routes settlements by their sentinel, not by timestamp', () => {
    const segments = computeBalanceSegments(
      [],
      [
        settlement({ id: 'solo-s', payerUid: ABSENT_CO_PARENT, payeeUid: A, amount: 3000 }),
        settlement({ id: 'agreed-s', payerUid: B, payeeUid: A, amount: 7000 }),
      ],
      [A, B],
      JOINED_AT,
    );

    // The absent co-parent "paid" A 3000 during the solo period → A owes B less.
    expect(segments.solo?.netAOwesB).toBe(3000);
    expect(segments.agreed.netAOwesB).toBe(7000);
  });

  it('never double-counts — a record contributes to exactly one segment', () => {
    const receipts = [receipt({ id: 'r-solo', sharedAt: 500 }), receipt({ id: 'r-new', sharedAt: 1500 })];
    const settlements = [
      settlement({ id: 's-solo', payerUid: ABSENT_CO_PARENT, payeeUid: A, amount: 1000 }),
      settlement({ id: 's-new', payerUid: B, payeeUid: A, amount: 2000 }),
    ];

    const both = computeBalanceSegments(receipts, settlements, [A, B], JOINED_AT);
    const soloOnly = computeBalanceSegments([receipts[0]], [settlements[0]], [A, B], JOINED_AT);
    const agreedOnly = computeBalanceSegments([receipts[1]], [settlements[1]], [A, B], JOINED_AT);

    expect(both.solo?.netAOwesB).toBe(soloOnly.solo?.netAOwesB);
    expect(both.agreed.netAOwesB).toBe(agreedOnly.agreed.netAOwesB);
  });

  // This is *why* the ledger is segmented rather than summed into one figure.
  it('keeps solo-period settlements visible, which a single combined balance would drop', () => {
    const soloSettlement = settlement({ payerUid: ABSENT_CO_PARENT, payeeUid: A, amount: 1000 });

    const segmented = computeBalanceSegments([], [soloSettlement], [A, B], JOINED_AT);
    // The naive post-join view: one balance between the two real uids. The
    // sentinel matches neither, so the payment silently vanishes.
    const naive = computeBalance([], [soloSettlement], [A, B]);

    expect(segmented.solo?.netAOwesB).toBe(1000);
    expect(naive.netAOwesB).toBe(0);
  });
});
