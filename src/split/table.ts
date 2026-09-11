import type { ReceiptTag } from '../models/Receipt';
import type { SplitProposal, SplitTable } from '../models/Split';

/** The active split table = the newest `approved` proposal, or null if none. */
export function activeSplit(proposals: SplitProposal[]): SplitTable | null {
  const approved = proposals
    .filter((p) => p.status === 'approved')
    .sort((a, b) => b.createdAt - a.createdAt);
  const p = approved[0];
  if (!p) return null;
  return { defaultPercentA: p.defaultPercentA, overrides: p.overrides };
}

/** A still-pending proposal, if one is open (there is at most one that matters). */
export function pendingSplitProposal(proposals: SplitProposal[]): SplitProposal | null {
  return (
    proposals
      .filter((p) => p.status === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  );
}

export interface SplitResolution {
  /** `parentIds[0]`'s % for the receipt, or null when a pick is still needed. */
  percentA: number | null;
  needsPick: boolean;
  /** One entry per distinct rule the receipt's tags map to. */
  choices: { tag: ReceiptTag; percentA: number }[];
}

/**
 * Resolve a receipt's split from its tags:
 * - no tags  → the default
 * - one rule → that rule
 * - ≥2 different rules → `needsPick`; `pick` (a tag) selects one
 */
export function resolveSplitPercent(
  table: SplitTable,
  tags: ReceiptTag[],
  pick?: ReceiptTag,
): SplitResolution {
  if (tags.length === 0) {
    return { percentA: table.defaultPercentA, needsPick: false, choices: [] };
  }

  const perTag = tags.map((tag) => ({
    tag,
    percentA: table.overrides[tag] ?? table.defaultPercentA,
  }));
  const distinct = [...new Set(perTag.map((x) => x.percentA))];

  if (distinct.length <= 1) {
    return { percentA: distinct[0] ?? table.defaultPercentA, needsPick: false, choices: [] };
  }

  const picked = pick != null ? perTag.find((x) => x.tag === pick) : undefined;
  return {
    percentA: picked ? picked.percentA : null,
    needsPick: picked == null,
    choices: perTag,
  };
}
