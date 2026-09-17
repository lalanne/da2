import { render, screen } from '@testing-library/react-native';
import { CreateHouseholdScreen } from '../CreateHouseholdScreen';
import { useHouseholdStore } from '../../store/householdStore';
import { strings } from '../../i18n/strings';

jest.mock('../../store/householdStore', () => ({
  useHouseholdStore: jest.fn(),
}));

const mockedStore = useHouseholdStore as unknown as jest.Mock;

function mockStore(overrides: Record<string, unknown> = {}) {
  mockedStore.mockReturnValue({
    createHousehold: jest.fn(async () => true),
    isSubmitting: false,
    actionError: null,
    ...overrides,
  });
}

describe('CreateHouseholdScreen', () => {
  it('renders the name field, one child row, and the submit button', async () => {
    mockStore();
    await render(<CreateHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('household-name-input')).toBeTruthy();
    expect(screen.getByTestId('child-name-input-0')).toBeTruthy();
    expect(screen.getByTestId('create-household-submit')).toBeTruthy();
    expect(screen.queryByTestId('create-household-server-error')).toBeNull();
  });

  it('shows the submit button in a loading state while creating', async () => {
    mockStore({ isSubmitting: true });
    await render(<CreateHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('create-household-submit-loading')).toBeTruthy();
  });

  // Regression: a rejected/failed createHousehold() (e.g. Firestore rules
  // denial) set the store's actionError but the screen never rendered it —
  // the submit button just un-spun with zero feedback (reported from the
  // pilot: household creation for a fresh account appeared to do nothing).
  it('shows the store action error when creation fails server-side', async () => {
    mockStore({ actionError: strings.common.genericError });
    await render(<CreateHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('create-household-server-error')).toHaveTextContent(
      strings.common.genericError,
    );
  });
});
