import { isProvisional, isUnilateral, needsReview } from '../provisional';

const base = {
  proposerId: 'solo',
  status: 'approved',
  resolvedBy: 'solo',
  acknowledgedBy: null,
};

describe('isUnilateral', () => {
  it('is true when the approver is the proposer (only possible while solo)', () => {
    expect(isUnilateral(base)).toBe(true);
  });

  it('is false for a normally approved proposal', () => {
    expect(isUnilateral({ ...base, resolvedBy: 'other' })).toBe(false);
  });

  it('is false for anything not approved', () => {
    expect(isUnilateral({ ...base, status: 'pending', resolvedBy: null })).toBe(false);
    expect(isUnilateral({ ...base, status: 'rejected' })).toBe(false);
    expect(isUnilateral({ ...base, status: 'cancelled' })).toBe(false);
  });
});

describe('isProvisional', () => {
  it('is true for an unacknowledged unilateral decision', () => {
    expect(isProvisional(base)).toBe(true);
  });

  it('is false once the co-parent has accepted it', () => {
    expect(isProvisional({ ...base, acknowledgedBy: 'other' })).toBe(false);
  });

  it('is false for a bilaterally approved decision', () => {
    expect(isProvisional({ ...base, resolvedBy: 'other' })).toBe(false);
  });
});

describe('needsReview', () => {
  const mine = { ...base, proposerId: 'me', resolvedBy: 'me' };
  const theirs = { ...base, proposerId: 'them', resolvedBy: 'them' };

  it('surfaces provisional decisions made by the *other* parent', () => {
    expect(needsReview([mine, theirs], 'me')).toEqual([theirs]);
  });

  it('is empty while solo — the only parent is always the proposer', () => {
    expect(needsReview([mine], 'me')).toEqual([]);
  });

  it('excludes decisions already acknowledged', () => {
    expect(needsReview([{ ...theirs, acknowledgedBy: 'me' }], 'me')).toEqual([]);
  });

  it('excludes ordinary bilateral decisions', () => {
    expect(needsReview([{ ...theirs, resolvedBy: 'me' }], 'me')).toEqual([]);
  });
});
