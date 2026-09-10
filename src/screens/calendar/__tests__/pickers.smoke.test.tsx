import { render, screen } from '@testing-library/react-native';
import { PatternSetup } from '../PatternSetup';
import { ProposeOverride } from '../ProposeOverride';
import type { Household } from '../../../models/Household';

const household: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1', 'u2'],
  children: [],
  pendingInviteCode: null,
  timezone: 'America/Santiago',
  createdBy: 'u1',
  createdAt: 0,
};
const members = [
  { uid: 'u1', displayName: 'Javiera', isYou: true },
  { uid: 'u2', displayName: 'Cristián', isYou: false },
];
const noop = jest.fn(async () => true);

describe('spec 009 pickers mount in the calendar screens', () => {
  it('PatternSetup renders DateField / TimeField for anchor, changeover, effective-from', async () => {
    await render(
      <PatternSetup
        household={household}
        members={members}
        isSubmitting={false}
        onSubmit={noop}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByTestId('pattern-anchor-field')).toBeTruthy();
    expect(screen.getByTestId('pattern-changeover-field')).toBeTruthy();
    expect(screen.getByTestId('pattern-effective-from-field')).toBeTruthy();
  });

  it('ProposeOverride shows the from/to TimeFields once "all day" is off', async () => {
    await render(
      <ProposeOverride
        date="2026-09-20"
        household={household}
        members={members}
        isSubmitting={false}
        onSubmit={noop}
        onBack={jest.fn()}
      />,
    );
    // defaults to all-day, so the time fields are hidden
    expect(screen.getByTestId('propose-allday-toggle')).toBeTruthy();
    expect(screen.queryByTestId('propose-from-field')).toBeNull();
  });
});
