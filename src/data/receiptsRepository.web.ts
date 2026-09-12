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
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import { webApp } from './firebaseWebApp';
import {
  isReceiptTag,
  type Receipt,
  type ReceiptFileType,
  type ReceiptTag,
  type ReceiptVisibility,
} from '../models/Receipt';
import type { ReceiptsRepository } from './receiptsRepository';

function db() {
  return getFirestore(webApp());
}
function storage() {
  return getStorage(webApp());
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

    // `file.uri` is a blob: URL on web (from expo-image-picker / -document-picker) —
    // fetch it back into a Blob for the Storage web SDK, which has no
    // native-file-path upload like putFile.
    const blob = await (await fetch(file.uri)).blob();
    await uploadBytes(storageRef(storage(), storagePath), blob, { contentType });

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
      await deleteObject(storageRef(storage(), receipt.storagePath));
    } catch {
      // file may already be gone — the metadata delete is what matters
    }
    await deleteDoc(doc(receiptsCollection(householdId), receipt.id));
  },

  // No native filesystem to cache into on web — the Storage rules still
  // apply (getDownloadURL requires a signed-in, authorized read), and the
  // browser handles HTTP caching on its own. <Image>/window.open take an
  // https URL directly, so this is simpler than the native path, not a
  // workaround (spec 011).
  async localFileUri(receipt) {
    return getDownloadURL(storageRef(storage(), receipt.storagePath));
  },
};
