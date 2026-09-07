import type {
  DayOverrideProposal,
  PatternProposal,
  Proposal,
} from '../models/Custody';

export function approvedPatterns(proposals: Proposal[]): PatternProposal[] {
  return proposals.filter(
    (p): p is PatternProposal => p.type === 'pattern' && p.status === 'approved',
  );
}

export function approvedOverrides(proposals: Proposal[]): DayOverrideProposal[] {
  return proposals.filter(
    (p): p is DayOverrideProposal => p.type === 'day-override' && p.status === 'approved',
  );
}

export function pendingProposals(proposals: Proposal[]): Proposal[] {
  return proposals.filter((p) => p.status === 'pending');
}

/** Pending proposals awaiting *this* user's response (they did not propose them). */
export function pendingForResponder(proposals: Proposal[], uid: string): Proposal[] {
  return proposals.filter((p) => p.status === 'pending' && p.proposerId !== uid);
}

export function hasPendingPattern(proposals: Proposal[]): boolean {
  return proposals.some((p) => p.type === 'pattern' && p.status === 'pending');
}

/** Dates (yyyy-mm-dd) touched by a pending proposal — for calendar badges. */
export function pendingDates(proposals: Proposal[]): Set<string> {
  const out = new Set<string>();
  for (const p of proposals) {
    if (p.status !== 'pending') continue;
    if (p.type === 'day-override') out.add(p.date);
    // pattern proposals aren't badged per-day (they'd cover everything).
  }
  return out;
}
