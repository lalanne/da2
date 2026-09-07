export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type PresetLabel =
  | 'alternating-weeks'
  | 'every-other-weekend'
  | '2-2-3'
  | 'custom';

interface ProposalBase {
  id: string;
  proposerId: string;
  status: ProposalStatus;
  createdAt: number;
  resolvedAt: number | null;
  /** Who approved / rejected. null while pending and on cancel. */
  resolvedBy: string | null;
}

export interface PatternProposal extends ProposalBase {
  type: 'pattern';
  /** parentIds index (0 | 1) per cycle day; length 7 or 14. */
  cycle: number[];
  /** yyyy-mm-dd — the calendar day at cycle position 0. */
  anchorDate: string;
  /** HH:mm, household-local — applied at every parent transition. */
  changeoverTime: string;
  /** yyyy-mm-dd — this pattern governs dates >= here. */
  effectiveFrom: string;
  presetLabel: PresetLabel;
}

export interface DayOverrideProposal extends ProposalBase {
  type: 'day-override';
  /** yyyy-mm-dd — the calendar day this override paints. */
  date: string;
  /** parentIds index (0 | 1). */
  assignedTo: number;
  /** HH:mm or null (= 00:00). */
  startTime: string | null;
  /** HH:mm or null (= 24:00). */
  endTime: string | null;
}

export type Proposal = PatternProposal | DayOverrideProposal;

export interface NewPatternInput {
  cycle: number[];
  anchorDate: string;
  changeoverTime: string;
  effectiveFrom: string;
  presetLabel: PresetLabel;
}

export interface NewDayOverrideInput {
  date: string;
  assignedTo: number;
  startTime: string | null;
  endTime: string | null;
}
