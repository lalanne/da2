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
  if (!uid) return strings.custody.theOtherParent;
  const m = members.find((x) => x.uid === uid);
  return m?.displayName ?? strings.custody.theOtherParent;
}

export function parentTint(index: number): ThemeColor {
  return index === 0 ? 'parentASoft' : 'parentBSoft';
}

export function parentStrong(index: number): ThemeColor {
  return index === 0 ? 'parentA' : 'parentB';
}
