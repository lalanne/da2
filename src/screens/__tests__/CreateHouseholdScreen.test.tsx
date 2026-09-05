import { render, screen } from '@testing-library/react-native';
import { CreateHouseholdScreen } from '../CreateHouseholdScreen';
import { useHouseholdStore } from '../../store/householdStore';

jest.mock('../../store/householdStore', () => ({
  useHouseholdStore: jest.fn(),
}));

const mockedStore = useHouseholdStore as unknown as jest.Mock;

describe('CreateHouseholdScreen', () => {
  it('renders the name field, one child row, and the submit button', async () => {
    mockedStore.mockReturnValue({ createHousehold: jest.fn(async () => true), isSubmitting: false });
    await render(<CreateHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('household-name-input')).toBeTruthy();
    expect(screen.getByTestId('child-name-input-0')).toBeTruthy();
    expect(screen.getByTestId('create-household-submit')).toBeTruthy();
  });

  it('shows a spinner instead of the submit button while creating', async () => {
    mockedStore.mockReturnValue({ createHousehold: jest.fn(async () => true), isSubmitting: true });
    await render(<CreateHouseholdScreen onBack={jest.fn()} />);

    expect(screen.getByTestId('create-household-spinner')).toBeTruthy();
    expect(screen.queryByTestId('create-household-submit')).toBeNull();
  });
});
