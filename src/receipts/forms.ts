import { strings } from '../i18n/strings';
import { isIsoDate } from '../custody/dates';
import {
  MAX_RECEIPT_BYTES,
  type NewReceiptInput,
  type PickedFile,
  type ReceiptCategory,
} from '../models/Receipt';
import { parseAmount } from './money';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate a picked file before anything is uploaded (criterion 4). */
export function validatePickedFile(file: PickedFile): Result<PickedFile> {
  const e = strings.receipts.upload.errors;
  if (file.size != null && file.size > MAX_RECEIPT_BYTES) {
    return { ok: false, error: e.tooLarge };
  }
  const mime = file.mimeType ?? '';
  if (file.fileType === 'image' && !mime.startsWith('image/') && mime !== '') {
    return { ok: false, error: e.badType };
  }
  if (file.fileType === 'pdf' && mime !== '' && mime !== 'application/pdf') {
    return { ok: false, error: e.badType };
  }
  return { ok: true, value: file };
}

export interface ReceiptFormState {
  amount: string;
  currency: string;
  category: ReceiptCategory;
  expenseDate: string;
  note: string;
  childId: string | null;
}

export function buildReceiptInput(f: ReceiptFormState): Result<NewReceiptInput> {
  const e = strings.receipts.form.errors;
  const amount = parseAmount(f.amount, f.currency);
  if (amount == null || amount <= 0) return { ok: false, error: e.badAmount };
  if (!isIsoDate(f.expenseDate)) return { ok: false, error: e.badDate };
  return {
    ok: true,
    value: {
      amount,
      currency: f.currency,
      category: f.category,
      expenseDate: f.expenseDate,
      note: f.note.trim() || null,
      childId: f.childId,
    },
  };
}
