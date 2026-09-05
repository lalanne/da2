import type { NewHouseholdInput } from '../models/Household';
import { strings } from '../i18n/strings';

export interface ChildRow {
  name: string;
  birthdate: string;
}

const BIRTHDATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ValidationResult =
  | { ok: true; value: NewHouseholdInput }
  | { ok: false; error: string };

/** Pure validation for the create-household form (spec 002, criterion 1). */
export function validateNewHousehold(name: string, rows: ChildRow[]): ValidationResult {
  const e = strings.household.create.errors;

  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: e.missingName };

  const children = rows
    .map((r) => ({ name: r.name.trim(), birthdate: r.birthdate.trim() }))
    .filter((r) => r.name.length > 0);

  if (children.length === 0) return { ok: false, error: e.noChildren };
  if (children.some((c) => c.birthdate && !BIRTHDATE_PATTERN.test(c.birthdate))) {
    return { ok: false, error: e.badBirthdate };
  }

  return {
    ok: true,
    value: {
      name: trimmedName,
      children: children.map((c) => ({ name: c.name, birthdate: c.birthdate || null })),
    },
  };
}
