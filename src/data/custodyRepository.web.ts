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
import type {
  NewDayOverrideInput,
  NewPatternInput,
  Proposal,
} from '../models/Custody';
import type { CustodyRepository } from './custodyRepository';

function db() {
  return getFirestore(webApp());
}

function proposalsCollection(householdId: string) {
  return collection(db(), 'households', householdId, 'proposals');
}

/** Spec 015 — see the native twin for the rationale. */
function resolutionFields(solo: boolean, proposerId: string) {
  return solo
    ? { status: 'approved' as const, resolvedAt: serverTimestamp(), resolvedBy: proposerId }
    : { status: 'pending' as const, resolvedAt: null, resolvedBy: null };
}

function toMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return typeof value === 'number' ? value : 0;
}

function mapProposal(id: string, data: Record<string, unknown>): Proposal | null {
  const base = {
    id,
    proposerId: String(data.proposerId ?? ''),
    status: (data.status as Proposal['status']) ?? 'pending',
    createdAt: toMillis(data.createdAt),
    resolvedAt: data.resolvedAt != null ? toMillis(data.resolvedAt) : null,
    resolvedBy: (data.resolvedBy as string | null) ?? null,
    acknowledgedBy: (data.acknowledgedBy as string | null) ?? null,
  };
  if (data.type === 'pattern') {
    return {
      ...base,
      type: 'pattern',
      cycle: Array.isArray(data.cycle) ? (data.cycle as number[]) : [],
      anchorDate: String(data.anchorDate ?? ''),
      changeoverTime: String(data.changeoverTime ?? ''),
      effectiveFrom: String(data.effectiveFrom ?? ''),
      presetLabel: (data.presetLabel as never) ?? 'custom',
    };
  }
  if (data.type === 'day-override') {
    return {
      ...base,
      type: 'day-override',
      date: String(data.date ?? ''),
      assignedTo: typeof data.assignedTo === 'number' ? data.assignedTo : 0,
      startTime: (data.startTime as string | null) ?? null,
      endTime: (data.endTime as string | null) ?? null,
    };
  }
  return null;
}

export const custodyRepository: CustodyRepository = {
  subscribeToProposals(householdId, cb, onError) {
    return onSnapshot(
      query(proposalsCollection(householdId), orderBy('createdAt', 'desc')),
      (snap) => {
        const out: Proposal[] = [];
        snap.forEach((docSnap) => {
          const mapped = mapProposal(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (mapped) out.push(mapped);
        });
        cb(out);
      },
      (error: unknown) => onError?.(error),
    );
  },

  async createPatternProposal(householdId, proposerId, input: NewPatternInput, solo) {
    await addDoc(proposalsCollection(householdId), {
      type: 'pattern',
      proposerId,
      ...resolutionFields(solo, proposerId),
      acknowledgedBy: null,
      createdAt: serverTimestamp(),
      cycle: input.cycle,
      anchorDate: input.anchorDate,
      changeoverTime: input.changeoverTime,
      effectiveFrom: input.effectiveFrom,
      presetLabel: input.presetLabel,
    });
  },

  async createDayOverrideProposal(householdId, proposerId, input: NewDayOverrideInput, solo) {
    await addDoc(proposalsCollection(householdId), {
      type: 'day-override',
      proposerId,
      ...resolutionFields(solo, proposerId),
      acknowledgedBy: null,
      createdAt: serverTimestamp(),
      date: input.date,
      assignedTo: input.assignedTo,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  },

  async resolveProposal(householdId, proposalId, uid, decision) {
    await updateDoc(doc(proposalsCollection(householdId), proposalId), {
      status: decision,
      resolvedAt: serverTimestamp(),
      resolvedBy: uid,
    });
  },

  async cancelProposal(householdId, proposalId) {
    await updateDoc(doc(proposalsCollection(householdId), proposalId), {
      status: 'cancelled',
      resolvedAt: serverTimestamp(),
    });
  },

  async acknowledgeProposal(householdId, proposalId, uid) {
    await updateDoc(doc(proposalsCollection(householdId), proposalId), {
      acknowledgedBy: uid,
    });
  },
};
