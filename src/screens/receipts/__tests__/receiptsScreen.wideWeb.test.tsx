import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReceiptsScreen } from '../ReceiptsScreen';
import { useAuthStore } from '../../../store/authStore';
import { useHouseholdStore } from '../../../store/householdStore';
import { useReceiptsStore } from '../../../store/receiptsStore';
import { useSplitStore } from '../../../store/splitStore';
import { useWideWeb } from '../../../web/useWideWeb';
import type { Household } from '../../../models/Household';
import type { Receipt } from '../../../models/Receipt';

jest.mock('../../../store/authStore', () => ({ useAuthStore: jest.fn() }));
jest.mock('../../../store/householdStore', () => ({ useHouseholdStore: jest.fn() }));
jest.mock('../../../store/receiptsStore', () => ({ useReceiptsStore: jest.fn() }));
jest.mock('../../../store/splitStore', () => ({ useSplitStore: jest.fn() }));
jest.mock('../../../web/useWideWeb', () => ({ useWideWeb: jest.fn() }));

const mockedAuth = useAuthStore as unknown as jest.Mock;
const mockedHousehold = useHouseholdStore as unknown as jest.Mock;
const mockedReceipts = useReceiptsStore as unknown as jest.Mock;
const mockedSplit = useSplitStore as unknown as jest.Mock;
const mockedWideWeb = useWideWeb as unknown as jest.Mock;

function selectable(state: Record<string, unknown>) {
  return (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(state) : state;
}

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
const receipt: Receipt = {
  id: 'r1',
  uploaderId: 'u1',
  storagePath: 'receipts/r1.pdf',
  fileType: 'pdf',
  amount: 15000,
  currency: 'CLP',
  tags: ['medical'],
  expenseDate: '2026-09-10',
  note: null,
  childId: null,
  visibility: 'private',
  sharedAt: null,
  splitPercentA: null,
  createdAt: 0,
};

describe('ReceiptsScreen — wide web (spec 012)', () => {
  beforeEach(() => {
    mockedWideWeb.mockReturnValue(true);
    mockedAuth.mockImplementation(selectable({ user: { uid: 'u1', displayName: 'Javiera' } }));
    mockedHousehold.mockReturnValue({ household, members });
    mockedReceipts.mockReturnValue({
      mine: [receipt],
      shared: [],
      isSubmitting: false,
      actionError: null,
      upload: jest.fn(),
      clearActionError: jest.fn(),
      all: () => [receipt],
      fileUri: jest.fn().mockResolvedValue('file:///receipt.pdf'),
      share: jest.fn(),
      remove: jest.fn(),
    });
    mockedSplit.mockImplementation(selectable({ proposals: [], settlements: [] }));
  });

  it('shows the list and an empty detail pane side by side before anything is selected', async () => {
    await render(<ReceiptsScreen />);

    expect(screen.getByTestId('receipt-row-r1')).toBeTruthy();
    expect(screen.getByTestId('receipts-detail-pane')).toBeTruthy();
  });

  it('opens the detail pane in place, next to the still-visible list, on selection', async () => {
    await render(<ReceiptsScreen />);

    fireEvent.press(screen.getByTestId('receipt-row-r1'));

    expect(screen.getByTestId('receipt-row-r1')).toBeTruthy();
    expect(await screen.findByTestId('receipts-detail-pane')).toBeTruthy();
  });

  it('opens the upload form as a WebDialog over the list', async () => {
    await render(<ReceiptsScreen />);

    fireEvent.press(screen.getByTestId('receipts-add-button'));

    expect(await screen.findByTestId('receipts-dialog')).toBeTruthy();
    expect(screen.getByTestId('receipt-row-r1')).toBeTruthy();
  });
});
