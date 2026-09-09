import { strings } from '../../i18n/strings';
import { formatAmount } from '../../receipts';
import type { Receipt, ReceiptTag } from '../../models/Receipt';
import type { Household } from '../../models/Household';

export function tagLabel(tag: ReceiptTag): string {
  return strings.receipts.tags[tag];
}

/** Comma-joined tag labels, or the "Sin categoría" string when there are none. */
export function receiptTagsLabel(receipt: Receipt): string {
  if (receipt.tags.length === 0) return strings.receipts.uncategorized;
  return receipt.tags.map(tagLabel).join(', ');
}

export function receiptChildLabel(receipt: Receipt, household: Household): string | null {
  if (!receipt.childId) return null;
  return household.children.find((c) => c.id === receipt.childId)?.name ?? null;
}

export function receiptSubtitle(receipt: Receipt, household: Household): string {
  const parts = [receiptTagsLabel(receipt), receipt.expenseDate];
  const child = receiptChildLabel(receipt, household);
  if (child) parts.push(child);
  return parts.join(' · ');
}

export function receiptAmountLabel(receipt: Receipt): string {
  return formatAmount(receipt.amount, receipt.currency);
}
