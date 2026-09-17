/**
 * Spec 015 — "provisional" decisions.
 *
 * A decision made while the household had one parent was self-approved: its
 * `resolvedBy` equals its `proposerId`. That combination is impossible in a
 * two-parent household (specs 004/010 forbid approving your own proposal), so
 * it needs no extra flag — the document describes itself.
 *
 * Once a co-parent joins, such a decision keeps governing (a calendar with no
 * schedule is worse than one marked not-yet-agreed) but is shown as
 * *provisional* until that co-parent accepts it via `acknowledgedBy`.
 *
 * Shared by custody proposals (spec 004) and split proposals (spec 010) —
 * both carry the same four fields.
 */
export interface Acknowledgeable {
  proposerId: string;
  status: string;
  resolvedBy: string | null;
  acknowledgedBy: string | null;
}

/** Was this decided unilaterally (self-approved in a solo household)? */
export function isUnilateral(decision: Acknowledgeable): boolean {
  return decision.status === 'approved' && decision.resolvedBy === decision.proposerId;
}

/**
 * Unilateral *and* not yet accepted by anyone else — the state that earns an
 * "aún no acordado" label. Note this is true while still solo too; callers
 * that only care about the post-join review queue pass through
 * `needsReview` instead.
 */
export function isProvisional(decision: Acknowledgeable): boolean {
  return isUnilateral(decision) && decision.acknowledgedBy == null;
}

/**
 * The review queue: decisions the *current* user should accept or counter —
 * provisional ones they did not themselves make. Empty while solo (the only
 * parent is always the proposer), which is why no review UI appears until a
 * co-parent actually joins.
 */
export function needsReview<T extends Acknowledgeable>(decisions: T[], uid: string): T[] {
  return decisions.filter((d) => isProvisional(d) && d.proposerId !== uid);
}
