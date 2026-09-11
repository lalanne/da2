import { activeSplit, pendingSplitProposal, resolveSplitPercent } from '../table';
import { computeBalance, receiptShares } from '../shares';
import { buildSettlementInput, buildSplitProposalInput, stepPercent } from '../forms';
import { strings } from '../../i18n/strings';
import type { Receipt } from '../../models/Receipt';
import type { Settlement, SplitProposal } from '../../models/Split';

function proposal(over: Partial<SplitProposal> = {}): SplitProposal {
  return {
    id: 'p1',
    proposerId: 'a',
    status: 'approved',
    createdAt: 1,
    resolvedAt: 2,
    resolvedBy: 'b',
    defaultPercentA: 50,
    overrides: {},
    ...over,
  };
}

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    id: 'r1',
    uploaderId: 'a',
    storagePath: 'p',
    fileType: 'image',
    amount: 10000,
    currency: 'CLP',
    tags: [],
    expenseDate: '2026-09-01',
    note: null,
    childId: null,
    visibility: 'shared',
    sharedAt: 1,
    splitPercentA: 50,
    createdAt: 1,
    ...over,
  };
}

function settlement(over: Partial<Settlement> = {}): Settlement {
  return {
    id: 's1',
    recordedBy: 'a',
    status: 'confirmed',
    payerUid: 'a',
    payeeUid: 'b',
    amount: 1000,
    currency: 'CLP',
    note: null,
    createdAt: 1,
    resolvedAt: 2,
    resolvedBy: 'b',
    ...over,
  };
}

describe('activeSplit / pendingSplitProposal', () => {
  it('picks the newest approved table, ignoring pending/rejected/cancelled', () => {
    const ps = [
      proposal({ id: 'old', createdAt: 1, defaultPercentA: 40 }),
      proposal({ id: 'new', createdAt: 3, defaultPercentA: 60 }),
      proposal({ id: 'pend', createdAt: 5, status: 'pending', defaultPercentA: 70 }),
    ];
    expect(activeSplit(ps)?.defaultPercentA).toBe(60);
    expect(pendingSplitProposal(ps)?.id).toBe('pend');
  });
  it('returns null when nothing is approved', () => {
    expect(activeSplit([proposal({ status: 'pending' })])).toBeNull();
  });
});

describe('resolveSplitPercent', () => {
  const table = { defaultPercentA: 40, overrides: { medical: 50, sports: 70 } as const };

  it('no tags → the default', () => {
    expect(resolveSplitPercent(table, [])).toEqual({ percentA: 40, needsPick: false, choices: [] });
  });
  it('one tag → its rule, or the default if no override', () => {
    expect(resolveSplitPercent(table, ['medical']).percentA).toBe(50);
    expect(resolveSplitPercent(table, ['clothing']).percentA).toBe(40);
  });
  it('several tags that all resolve the same → no pick', () => {
    expect(resolveSplitPercent(table, ['clothing', 'other']).needsPick).toBe(false);
  });
  it('several tags with different rules → needs a pick, then honours it', () => {
    const r = resolveSplitPercent(table, ['medical', 'sports']);
    expect(r.needsPick).toBe(true);
    expect(r.percentA).toBeNull();
    expect(r.choices).toEqual([
      { tag: 'medical', percentA: 50 },
      { tag: 'sports', percentA: 70 },
    ]);
    expect(resolveSplitPercent(table, ['medical', 'sports'], 'sports').percentA).toBe(70);
  });
});

describe('receiptShares', () => {
  it('the two shares always sum to the amount (exact, deterministic)', () => {
    for (const [amount, pct] of [
      [10000, 50],
      [9991, 33],
      [9990, 40],
      [1, 50],
      [12345, 60],
    ] as const) {
      const { a, b } = receiptShares(amount, pct);
      expect(a + b).toBe(amount);
      expect(receiptShares(amount, pct)).toEqual({ a, b });
    }
  });
  it('0% / 100%', () => {
    expect(receiptShares(5000, 0)).toEqual({ a: 0, b: 5000 });
    expect(receiptShares(5000, 100)).toEqual({ a: 5000, b: 0 });
  });
});

describe('computeBalance', () => {
  const ids: [string, string] = ['a', 'b'];

  it('the non-payer owes their computed share; private receipts are ignored', () => {
    const receipts = [
      receipt({ id: '1', uploaderId: 'a', amount: 10000, splitPercentA: 40 }), // b owes 6000
      receipt({ id: '2', uploaderId: 'b', amount: 20000, splitPercentA: 40 }), // a owes 8000
      receipt({ id: '3', uploaderId: 'a', amount: 5000, visibility: 'private' }), // ignored
      receipt({ id: '4', uploaderId: 'a', amount: 5000, splitPercentA: null }), // ignored
    ];
    // netAOwesB = 8000 (a owes) − 6000 (b owes) = 2000
    expect(computeBalance(receipts, [], ids).netAOwesB).toBe(2000);
  });

  it('only confirmed settlements move the balance', () => {
    const receipts = [receipt({ uploaderId: 'b', amount: 10000, splitPercentA: 50 })]; // a owes 5000
    expect(computeBalance(receipts, [settlement({ status: 'pending', amount: 5000 })], ids).netAOwesB).toBe(5000);
    // a pays b 5000 (confirmed) → settled
    expect(computeBalance(receipts, [settlement({ payerUid: 'a', payeeUid: 'b', amount: 5000 })], ids).netAOwesB).toBe(0);
  });
});

describe('buildSplitProposalInput', () => {
  it('accepts a valid table and drops null overrides', () => {
    expect(
      buildSplitProposalInput({ defaultPercentA: 40, overrides: { medical: 50, sports: undefined } }),
    ).toEqual({ ok: true, value: { defaultPercentA: 40, overrides: { medical: 50 } } });
  });
  it('rejects an out-of-range percentage', () => {
    expect(buildSplitProposalInput({ defaultPercentA: 120, overrides: {} })).toEqual({
      ok: false,
      error: strings.split.errors.badPercent,
    });
    expect(buildSplitProposalInput({ defaultPercentA: 50, overrides: { medical: -1 } }).ok).toBe(false);
  });
});

describe('stepPercent', () => {
  it('clamps to 0…100', () => {
    expect(stepPercent(98, 5)).toBe(100);
    expect(stepPercent(3, -5)).toBe(0);
    expect(stepPercent(40, 5)).toBe(45);
  });
});

describe('buildSettlementInput', () => {
  it('"I paid" sets me as payer; "they paid" reverses; parses the amount', () => {
    expect(
      buildSettlementInput({ iPaid: true, amount: '30.000', note: '  x ', currency: 'CLP' }, 'me', 'them'),
    ).toEqual({
      ok: true,
      value: { payerUid: 'me', payeeUid: 'them', amount: 30000, currency: 'CLP', note: 'x' },
    });
    const r = buildSettlementInput({ iPaid: false, amount: '1000', note: '', currency: 'CLP' }, 'me', 'them');
    expect(r.ok && r.value.payerUid).toBe('them');
  });
  it('rejects a non-positive amount', () => {
    expect(buildSettlementInput({ iPaid: true, amount: '0', note: '', currency: 'CLP' }, 'me', 'them')).toEqual({
      ok: false,
      error: strings.split.errors.badAmount,
    });
  });
});
