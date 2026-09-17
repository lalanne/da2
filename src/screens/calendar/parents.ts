import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { strings } from '../../i18n/strings';
import type { ThemeColor } from '../../theme';

export function parentName(
  index: number,
  household: Household,
  members: HouseholdMember[],
): string {
  const uid = household.parentIds[index];
  // Spec 015 — while solo, index 1 has no uid; the sole parent's own name
  // for the absent side takes priority over the generic fallback.
  if (!uid) return household.coParentName ?? strings.custody.theOtherParent;
  const m = members.find((x) => x.uid === uid);
  return m?.displayName ?? strings.custody.theOtherParent;
}

export function parentTint(index: number): ThemeColor {
  return index === 0 ? 'parentASoft' : 'parentBSoft';
}

export function parentStrong(index: number): ThemeColor {
  return index === 0 ? 'parentA' : 'parentB';
}
