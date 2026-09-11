import * as FileSystem from 'expo-file-system/legacy';
import {
  deleteObject,
  getStorage,
  putFile,
  ref as storageRef,
  writeToFile,
} from '@react-native-firebase/storage';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {
  isReceiptTag,
  type NewReceiptInput,
  type PickedFile,
  type Receipt,
  type ReceiptFileType,
  type ReceiptTag,
  type ReceiptVisibility,
} from '../models/Receipt';

export type Unsubscribe = () => void;

export interface ReceiptsRepository {
  subscribeMine(
    householdId: string,
    uid: string,
    cb: (receipts: Receipt[]) => void,
    onError?: (error: unknown) => void,
  ): Unsubscribe;
  subscribeShared(
    householdId: string,
    cb: (receipts: Receipt[]) => void,
    onError?: (error: unknown) => void,
  ): Unsubscribe;
  /** Upload the file first, then write the metadata (spec 003 criterion 5). */
  uploadReceipt(
    householdId: string,
    uid: string,
    file: PickedFile,
    meta: NewReceiptInput,
  ): Promise<void>;
  shareReceipt(householdId: string, receiptId: string, splitPercentA: number): Promise<void>;
  deleteReceipt(householdId: string, receipt: Receipt): Promise<void>;
  /** Download (once, cached) via the SDK so Storage rules apply; returns a file:// uri. */
  localFileUri(receipt: Receipt): Promise<string>;
}

function db() {
  return getFirestore();
}

function receiptsCollection(householdId: string) {
  return collection(db(), 'households', householdId, 'receipts');
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === 'number' ? value : 0;
}

function mapReceipt(id: string, data: Record<string, unknown>): Receipt {
  return {
    id,
    uploaderId: String(data.uploaderId ?? ''),
    storagePath: String(data.storagePath ?? ''),
    fileType: (data.fileType as ReceiptFileType) ?? 'image',
    amount: typeof data.amount === 'number' ? data.amount : 0,
    currency: String(data.currency ?? 'CLP'),
    tags: Array.isArray(data.tags) ? (data.tags.filter(isReceiptTag) as ReceiptTag[]) : [],
    expenseDate: String(data.expenseDate ?? ''),
    note: (data.note as string | null) ?? null,
    childId: (data.childId as string | null) ?? null,
    visibility: (data.visibility as ReceiptVisibility) ?? 'private',
    sharedAt: data.sharedAt != null ? toMillis(data.sharedAt) : null,
    splitPercentA: typeof data.splitPercentA === 'number' ? data.splitPercentA : null,
    createdAt: toMillis(data.createdAt),
  };
}

function readSnapshot(snap: { forEach: (fn: (d: { id: string; data: () => unknown }) => void) => void }) {
  const out: Receipt[] = [];
  snap.forEach((d) => out.push(mapReceipt(d.id, d.data() as Record<string, unknown>)));
  return out;
}

export const receiptsRepository: ReceiptsRepository = {
  subscribeMine(householdId, uid, cb, onError) {
    return onSnapshot(
      query(receiptsCollection(householdId), where('uploaderId', '==', uid)),
      (snap) => cb(readSnapshot(snap)),
      (error: unknown) => onError?.(error),
    );
  },

  subscribeShared(householdId, cb, onError) {
    return onSnapshot(
      query(receiptsCollection(householdId), where('visibility', '==', 'shared')),
      (snap) => cb(readSnapshot(snap)),
      (error: unknown) => onError?.(error),
    );
  },

  async uploadReceipt(householdId, uid, file, meta) {
    const receiptRef = doc(receiptsCollection(householdId));
    const ext = file.fileType === 'pdf' ? 'pdf' : 'jpg';
    const storagePath = `households/${householdId}/receipts/${uid}/${receiptRef.id}.${ext}`;
    const contentType =
      file.mimeType ?? (file.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg');

    await putFile(storageRef(getStorage(), storagePath), file.uri, { contentType });

    await setDoc(receiptRef, {
      uploaderId: uid,
      storagePath,
      fileType: file.fileType,
      amount: meta.amount,
      currency: meta.currency,
      tags: meta.tags,
      expenseDate: meta.expenseDate,
      note: meta.note,
      childId: meta.childId,
      visibility: 'private',
      sharedAt: null,
      createdAt: serverTimestamp(),
    });
  },

  async shareReceipt(householdId, receiptId, splitPercentA) {
    await updateDoc(doc(receiptsCollection(householdId), receiptId), {
      visibility: 'shared',
      sharedAt: serverTimestamp(),
      splitPercentA,
    });
  },

  async deleteReceipt(householdId, receipt) {
    try {
      await deleteObject(storageRef(getStorage(), receipt.storagePath));
    } catch {
      // file may already be gone — the metadata delete is what matters
    }
    await deleteDoc(doc(receiptsCollection(householdId), receipt.id));
  },

  async localFileUri(receipt) {
    const ext = receipt.fileType === 'pdf' ? 'pdf' : 'jpg';
    const dir = `${FileSystem.cacheDirectory}receipts/`;
    const local = `${dir}${receipt.id}.${ext}`;
    const info = await FileSystem.getInfoAsync(local);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      await writeToFile(
        storageRef(getStorage(), receipt.storagePath),
        local.replace(/^file:\/\//, ''),
      );
    }
    return local;
  },
};
