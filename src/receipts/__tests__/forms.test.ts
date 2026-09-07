import { buildReceiptInput, validatePickedFile, type ReceiptFormState } from '../forms';
import { strings } from '../../i18n/strings';
import { MAX_RECEIPT_BYTES, type PickedFile } from '../../models/Receipt';

function form(overrides: Partial<ReceiptFormState> = {}): ReceiptFormState {
  return {
    amount: '12500',
    currency: 'CLP',
    category: 'medical',
    expenseDate: '2026-09-01',
    note: '',
    childId: null,
    ...overrides,
  };
}

function file(overrides: Partial<PickedFile> = {}): PickedFile {
  return { uri: 'file:///tmp/r.jpg', fileType: 'image', size: 1000, mimeType: 'image/jpeg', ...overrides };
}

describe('validatePickedFile', () => {
  it('accepts an image and a pdf under the limit', () => {
    expect(validatePickedFile(file()).ok).toBe(true);
    expect(validatePickedFile(file({ fileType: 'pdf', mimeType: 'application/pdf' })).ok).toBe(true);
  });
  it('rejects an oversize file', () => {
    expect(validatePickedFile(file({ size: MAX_RECEIPT_BYTES + 1 }))).toEqual({
      ok: false,
      error: strings.receipts.upload.errors.tooLarge,
    });
  });
  it('rejects a wrong mime type', () => {
    expect(validatePickedFile(file({ fileType: 'pdf', mimeType: 'image/png' }))).toEqual({
      ok: false,
      error: strings.receipts.upload.errors.badType,
    });
  });
});

describe('buildReceiptInput', () => {
  it('parses the amount to minor units and trims the note', () => {
    const r = buildReceiptInput(form({ amount: '12.500', note: '  boleta  ' }));
    expect(r).toEqual({
      ok: true,
      value: {
        amount: 12500,
        currency: 'CLP',
        category: 'medical',
        expenseDate: '2026-09-01',
        note: 'boleta',
        childId: null,
      },
    });
  });

  it('rejects a non-positive amount and a bad date', () => {
    expect(buildReceiptInput(form({ amount: '0' }))).toEqual({
      ok: false,
      error: strings.receipts.form.errors.badAmount,
    });
    expect(buildReceiptInput(form({ amount: 'x' }))).toEqual({
      ok: false,
      error: strings.receipts.form.errors.badAmount,
    });
    expect(buildReceiptInput(form({ expenseDate: '1 sep' }))).toEqual({
      ok: false,
      error: strings.receipts.form.errors.badDate,
    });
  });
});
