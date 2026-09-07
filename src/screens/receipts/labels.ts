import { strings } from '../../i18n/strings';
import { formatAmount } from '../../receipts';
import type { Receipt, ReceiptCategory } from '../../models/Receipt';
import type { Household } from '../../models/Household';

export function categoryLabel(category: ReceiptCategory): string {
  return strings.receipts.categories[category];
}

export function receiptChildLabel(receipt: Receipt, household: Household): string | null {
  if (!receipt.childId) return null;
  return household.children.find((c) => c.id === receipt.childId)?.name ?? null;
}

export function receiptSubtitle(receipt: Receipt, household: Household): string {
  const parts = [
    categoryLabel(receipt.category),
    receipt.expenseDate,
  ];
  const child = receiptChildLabel(receipt, household);
  if (child) parts.push(child);
  return parts.join(' · ');
}

export function receiptAmountLabel(receipt: Receipt): string {
  return formatAmount(receipt.amount, receipt.currency);
}
