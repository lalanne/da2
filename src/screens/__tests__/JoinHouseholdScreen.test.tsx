import { render, screen } from '@testing-library/react-native';
import { JoinHouseholdScreen } from '../JoinHouseholdScreen';
import { useHouseholdStore } from '../../store/householdStore';
import { strings } from '../../i18n/strings';

jest.mock('../../store/householdStore', () => ({
  useHouseholdStore: jest.fn(),
}));

const mockedStore = useHouseholdStore as unknown as jest.Mock;

function mockStore(overrides: Record<string, unknown> = {}) {
  mockedStore.mockReturnValue({
    joinHousehold: jest.fn(async () => true),
    clearActionError: jest.fn(),
    isSubmitting: false,
    actionError: null,
    ...overrides,
  });
}

describe('JoinHouseholdScreen', () => {
  it('renders the code field and submit button by default', async () => {
    mockStore();
    await render(<JoinHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('invite-code-input')).toBeTruthy();
    expect(screen.getByTestId('join-household-submit')).toBeTruthy();
    expect(screen.queryByTestId('join-household-error')).toBeNull();
  });

  it('shows the store action error', async () => {
    mockStore({ actionError: strings.household.join.errors.invalid });
    await render(<JoinHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('join-household-error')).toHaveTextContent(
      strings.household.join.errors.invalid,
    );
  });

  it('shows a spinner instead of the submit button while joining', async () => {
    mockStore({ isSubmitting: true });
    await render(<JoinHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('join-household-spinner')).toBeTruthy();
    expect(screen.queryByTestId('join-household-submit')).toBeNull();
  });
});
