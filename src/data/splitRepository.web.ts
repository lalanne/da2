import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { webApp } from './firebaseWebApp';
import { isReceiptTag, type ReceiptTag } from '../models/Receipt';
import type { Settlement, SplitProposal } from '../models/Split';
import type { SplitRepository } from './splitRepository';

function db() {
  return getFirestore(webApp());
}
const proposalsCol = (hid: string) => collection(db(), 'households', hid, 'splitProposals');
const settlementsCol = (hid: string) => collection(db(), 'households', hid, 'settlements');

/** Spec 015 — see the native twin for the rationale. */
function resolutionFields<Resolved extends string>(
  solo: boolean,
  resolvedStatus: Resolved,
  proposerId: string,
) {
  return solo
    ? { status: resolvedStatus, resolvedAt: serverTimestamp(), resolvedBy: proposerId }
    : { status: 'pending' as const, resolvedAt: null, resolvedBy: null };
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === 'number' ? value : 0;
}

function mapOverrides(raw: unknown): Partial<Record<ReceiptTag, number>> {
  const out: Partial<Record<ReceiptTag, number>> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isReceiptTag(k) && typeof v === 'number') out[k] = v;
    }
  }
  return out;
}

function mapProposal(id: string, d: Record<string, unknown>): SplitProposal {
  return {
    id,
    proposerId: String(d.proposerId ?? ''),
    status: (d.status as SplitProposal['status']) ?? 'pending',
    createdAt: toMillis(d.createdAt),
    resolvedAt: d.resolvedAt != null ? toMillis(d.resolvedAt) : null,
    resolvedBy: (d.resolvedBy as string | null) ?? null,
    acknowledgedBy: (d.acknowledgedBy as string | null) ?? null,
    defaultPercentA: typeof d.defaultPercentA === 'number' ? d.defaultPercentA : 50,
    overrides: mapOverrides(d.overrides),
  };
}

function mapSettlement(id: string, d: Record<string, unknown>): Settlement {
  return {
    id,
    recordedBy: String(d.recordedBy ?? ''),
    status: (d.status as Settlement['status']) ?? 'pending',
    payerUid: String(d.payerUid ?? ''),
    payeeUid: String(d.payeeUid ?? ''),
    amount: typeof d.amount === 'number' ? d.amount : 0,
    currency: String(d.currency ?? 'CLP'),
    note: (d.note as string | null) ?? null,
    createdAt: toMillis(d.createdAt),
    resolvedAt: d.resolvedAt != null ? toMillis(d.resolvedAt) : null,
    resolvedBy: (d.resolvedBy as string | null) ?? null,
  };
}

export const splitRepository: SplitRepository = {
  subscribeSplitProposals(householdId, cb, onError) {
    return onSnapshot(
      query(proposalsCol(householdId), orderBy('createdAt', 'desc')),
      (snap) => {
        const out: SplitProposal[] = [];
        snap.forEach((s) => out.push(mapProposal(s.id, s.data() as Record<string, unknown>)));
        cb(out);
      },
      (error: unknown) => onError?.(error),
    );
  },

  subscribeSettlements(householdId, cb, onError) {
    return onSnapshot(
      query(settlementsCol(householdId), orderBy('createdAt', 'desc')),
      (snap) => {
        const out: Settlement[] = [];
        snap.forEach((s) => out.push(mapSettlement(s.id, s.data() as Record<string, unknown>)));
        cb(out);
      },
      (error: unknown) => onError?.(error),
    );
  },

  async proposeSplit(householdId, proposerId, input, solo) {
    await addDoc(proposalsCol(householdId), {
      proposerId,
      ...resolutionFields(solo, 'approved', proposerId),
      acknowledgedBy: null,
      createdAt: serverTimestamp(),
      defaultPercentA: input.defaultPercentA,
      overrides: input.overrides,
    });
  },

  async resolveSplitProposal(householdId, proposalId, uid, decision) {
    await updateDoc(doc(proposalsCol(householdId), proposalId), {
      status: decision,
      resolvedAt: serverTimestamp(),
      resolvedBy: uid,
    });
  },

  async cancelSplitProposal(householdId, proposalId) {
    await updateDoc(doc(proposalsCol(householdId), proposalId), {
      status: 'cancelled',
      resolvedAt: serverTimestamp(),
    });
  },

  async acknowledgeSplitProposal(householdId, proposalId, uid) {
    await updateDoc(doc(proposalsCol(householdId), proposalId), {
      acknowledgedBy: uid,
    });
  },

  async recordSettlement(householdId, recordedBy, input, solo) {
    await addDoc(settlementsCol(householdId), {
      recordedBy,
      ...resolutionFields(solo, 'confirmed', recordedBy),
      createdAt: serverTimestamp(),
      payerUid: input.payerUid,
      payeeUid: input.payeeUid,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
    });
  },

  async resolveSettlement(householdId, settlementId, uid, decision) {
    await updateDoc(doc(settlementsCol(householdId), settlementId), {
      status: decision,
      resolvedAt: serverTimestamp(),
      resolvedBy: uid,
    });
  },

  async cancelSettlement(householdId, settlementId) {
    await updateDoc(doc(settlementsCol(householdId), settlementId), {
      status: 'cancelled',
      resolvedAt: serverTimestamp(),
    });
  },
};
