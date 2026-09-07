export type ReceiptCategory =
  | 'tuition'
  | 'medical'
  | 'sports'
  | 'clothing'
  | 'other';

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  'tuition',
  'medical',
  'sports',
  'clothing',
  'other',
];

export type ReceiptVisibility = 'private' | 'shared';
export type ReceiptFileType = 'image' | 'pdf';

export interface Receipt {
  id: string;
  uploaderId: string;
  storagePath: string;
  fileType: ReceiptFileType;
  /** Integer in the smallest unit of `currency` (CLP → whole pesos). */
  amount: number;
  currency: string;
  category: ReceiptCategory;
  expenseDate: string; // yyyy-mm-dd
  note: string | null;
  childId: string | null;
  visibility: ReceiptVisibility;
  sharedAt: number | null;
  createdAt: number;
}

export interface NewReceiptInput {
  amount: number;
  currency: string;
  category: ReceiptCategory;
  expenseDate: string;
  note: string | null;
  childId: string | null;
}

/** Local file chosen for upload, before any metadata is entered. */
export interface PickedFile {
  uri: string;
  fileType: ReceiptFileType;
  /** bytes, when the picker reports it. */
  size: number | null;
  mimeType: string | null;
}

export const DEFAULT_CURRENCY = 'CLP';
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
