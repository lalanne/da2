import { render, screen } from '@testing-library/react-native';
import { HouseholdPanel } from '../HouseholdPanel';
import { HouseholdTab } from '../HouseholdTab';
import { MainScreen } from '../MainScreen';
import { HouseholdOnboardingScreen } from '../HouseholdOnboardingScreen';
import { useHouseholdStore } from '../../store/householdStore';
import { useAuthStore } from '../../store/authStore';
import { useCustodyStore } from '../../store/custodyStore';
import type { Household } from '../../models/Household';

jest.mock('../../store/householdStore', () => ({ useHouseholdStore: jest.fn() }));
jest.mock('../../store/authStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../../store/custodyStore', () => ({ useCustodyStore: jest.fn() }));
jest.mock('../../hooks/useCustodySync', () => ({ useCustodySync: jest.fn() }));

const mockedHousehold = useHouseholdStore as unknown as jest.Mock;
const mockedAuth = useAuthStore as unknown as jest.Mock;
const mockedCustody = useCustodyStore as unknown as jest.Mock;

/** Make a store mock honour both `useStore()` and `useStore(selector)`. */
function selectable(state: Record<string, unknown>) {
  return (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(state) : state;
}

const soleParentHousehold: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1'],
  children: [
    { id: 'c1', name: 'Sofía', birthdate: null },
    { id: 'c2', name: 'Mateo', birthdate: '2016-04-22' },
  ],
  pendingInviteCode: '2Q8D48W4',
  timezone: 'America/Santiago',
  createdBy: 'u1',
  createdAt: 0,
};

describe('screen smoke tests', () => {
  it('HouseholdPanel renders the invite code, members and kids for a sole parent', async () => {
    mockedHousehold.mockReturnValue({
      household: soleParentHousehold,
      members: [{ uid: 'u1', displayName: 'Javiera', isYou: true }],
      regenerateInviteCode: jest.fn(),
      isSubmitting: false,
    });
    await render(<HouseholdPanel />);

    expect(screen.getByTestId('invite-code-box')).toBeTruthy();
    expect(screen.getByTestId('invite-code-value')).toHaveTextContent('2Q8D48W4');
    expect(screen.getByTestId('share-invite-button')).toBeTruthy();
    expect(screen.getByTestId('regenerate-invite-button')).toBeTruthy();
    expect(screen.getByTestId('household-member-u1')).toBeTruthy();
    expect(screen.getByTestId('household-child-c1')).toHaveTextContent('Sofía');
  });

  it('HouseholdPanel hides the invite code once both parents are linked', async () => {
    mockedHousehold.mockReturnValue({
      household: { ...soleParentHousehold, parentIds: ['u1', 'u2'], pendingInviteCode: null },
      members: [
        { uid: 'u1', displayName: 'Javiera', isYou: true },
        { uid: 'u2', displayName: 'Cristián', isYou: false },
      ],
      regenerateInviteCode: jest.fn(),
      isSubmitting: false,
    });
    await render(<HouseholdPanel />);

    expect(screen.queryByTestId('invite-code-box')).toBeNull();
    expect(screen.getByTestId('household-member-u2')).toBeTruthy();
    expect(screen.getByText('Cristián')).toBeTruthy();
  });

  it('HouseholdTab renders the greeting and sign-out', async () => {
    mockedAuth.mockReturnValue({ user: { displayName: 'Javiera' }, signOut: jest.fn() });
    mockedHousehold.mockReturnValue({
      household: soleParentHousehold,
      members: [{ uid: 'u1', displayName: 'Javiera', isYou: true }],
      regenerateInviteCode: jest.fn(),
      isSubmitting: false,
    });
    await render(<HouseholdTab />);

    expect(screen.getByText('Hola, Javiera')).toBeTruthy();
    expect(screen.getByTestId('sign-out-button')).toBeTruthy();
  });

  it('MainScreen shows the calendar tab with an empty-pattern state', async () => {
    mockedAuth.mockImplementation(selectable({ user: { uid: 'u1', displayName: 'Javiera' } }));
    mockedHousehold.mockImplementation(
      selectable({
        household: { ...soleParentHousehold, parentIds: ['u1', 'u2'] },
        members: [
          { uid: 'u1', displayName: 'Javiera', isYou: true },
          { uid: 'u2', displayName: 'Cristián', isYou: false },
        ],
      }),
    );
    mockedCustody.mockImplementation(
      selectable({ proposals: [], isSubmitting: false, resolve: jest.fn(), cancel: jest.fn() }),
    );

    await render(<MainScreen />);

    expect(screen.getByTestId('tab-calendar')).toBeTruthy();
    expect(screen.getByTestId('tab-household')).toBeTruthy();
    expect(screen.getByTestId('calendar-setup-pattern')).toBeTruthy();
  });

  it('HouseholdOnboardingScreen renders the two choices', async () => {
    mockedHousehold.mockReturnValue({});
    await render(<HouseholdOnboardingScreen />);

    expect(screen.getByTestId('onboarding-create-button')).toBeTruthy();
    expect(screen.getByTestId('onboarding-join-button')).toBeTruthy();
  });
});
