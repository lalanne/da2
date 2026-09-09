import type { Receipt, ReceiptTag } from '../models/Receipt';

/** Merge the "mine" and "shared" query results, dedupe by id, newest first. */
export function mergeReceipts(mine: Receipt[], shared: Receipt[]): Receipt[] {
  const byId = new Map<string, Receipt>();
  for (const r of [...mine, ...shared]) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** `null` = all tags, `'none'` = only untagged, otherwise receipts carrying that tag. */
export type TagFilter = ReceiptTag | 'none' | null;

export interface ReceiptFilter {
  tag: TagFilter;
  /** 'yyyy-mm' or null. */
  month: string | null;
}

export function filterReceipts(receipts: Receipt[], filter: ReceiptFilter): Receipt[] {
  return receipts.filter((r) => {
    if (filter.tag === 'none' && r.tags.length > 0) return false;
    if (filter.tag != null && filter.tag !== 'none' && !r.tags.includes(filter.tag)) return false;
    if (filter.month && r.expenseDate.slice(0, 7) !== filter.month) return false;
    return true;
  });
}

/** Distinct 'yyyy-mm' present in the receipts, newest first — for the filter chips. */
export function availableMonths(receipts: Receipt[]): string[] {
  const months = new Set(receipts.map((r) => r.expenseDate.slice(0, 7)));
  return [...months].sort().reverse();
}
