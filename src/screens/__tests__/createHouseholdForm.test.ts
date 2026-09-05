import { validateNewHousehold } from '../createHouseholdForm';
import { strings } from '../../i18n/strings';

const e = strings.household.create.errors;

describe('validateNewHousehold', () => {
  it('requires a household name', () => {
    expect(validateNewHousehold('  ', [{ name: 'Sofía', birthdate: '' }])).toEqual({
      ok: false,
      error: e.missingName,
    });
  });

  it('requires at least one named child', () => {
    expect(validateNewHousehold('Los García', [{ name: '  ', birthdate: '' }])).toEqual({
      ok: false,
      error: e.noChildren,
    });
  });

  it('rejects a malformed birthdate', () => {
    expect(
      validateNewHousehold('Los García', [{ name: 'Sofía', birthdate: '12-03-2018' }]),
    ).toEqual({ ok: false, error: e.badBirthdate });
  });

  it('trims the name, drops unnamed rows, and normalizes an empty birthdate to null', () => {
    expect(
      validateNewHousehold('  Los García  ', [
        { name: ' Sofía ', birthdate: '2018-03-12' },
        { name: '', birthdate: '' },
        { name: 'Mateo', birthdate: '  ' },
      ]),
    ).toEqual({
      ok: true,
      value: {
        name: 'Los García',
        children: [
          { name: 'Sofía', birthdate: '2018-03-12' },
          { name: 'Mateo', birthdate: null },
        ],
      },
    });
  });
});
