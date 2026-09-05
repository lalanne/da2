import { strings } from '../i18n/strings';

export type HouseholdErrorKind =
  | 'codeBadFormat'
  | 'codeInvalid' // unknown or already redeemed
  | 'householdFull'
  | 'alreadyInHousehold'
  | 'joinFailed'
  | 'createFailed';

const MESSAGES: Record<HouseholdErrorKind, string> = {
  codeBadFormat: strings.household.join.errors.badFormat,
  codeInvalid: strings.household.join.errors.invalid,
  householdFull: strings.household.join.errors.householdFull,
  alreadyInHousehold: strings.common.genericError,
  joinFailed: strings.household.join.errors.failed,
  createFailed: strings.common.genericError,
};

export class HouseholdError extends Error {
  readonly kind: HouseholdErrorKind;

  constructor(kind: HouseholdErrorKind, message?: string) {
    super(message ?? MESSAGES[kind]);
    this.kind = kind;
    this.name = 'HouseholdError';
  }
}
