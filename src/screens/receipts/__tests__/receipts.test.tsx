import { render, screen } from '@testing-library/react-native';
import { ReceiptUpload } from '../ReceiptUpload';
import { ReceiptDetail } from '../ReceiptDetail';
import { useReceiptsStore } from '../../../store/receiptsStore';
import type { Household } from '../../../models/Household';
import type { Receipt } from '../../../models/Receipt';
import { strings } from '../../../i18n/strings';

jest.mock('../../../store/receiptsStore', () => ({ useReceiptsStore: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));

const mockedStore = useReceiptsStore as unknown as jest.Mock;

const household: Household = {
  id: 'h1',
  name: 'Los García',
  parentIds: ['u1', 'u2'],
  children: [{ id: 'c1', name: 'Sofía', birthdate: null }],
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
  storagePath: 'households/h1/receipts/u1/r1.jpg',
  fileType: 'image',
  amount: 12500,
  currency: 'CLP',
  tags: ['medical'],
  expenseDate: '2026-09-01',
  note: 'boleta clínica',
  childId: 'c1',
  visibility: 'private',
  sharedAt: null,
  splitPercentA: null,
  createdAt: 1,
};

describe('ReceiptUpload', () => {
  it('starts on the source picker', async () => {
    await render(
      <ReceiptUpload household={household} isSubmitting={false} onSubmit={jest.fn(async () => true)} onBack={jest.fn()} />,
    );
    expect(screen.getByTestId('pick-camera')).toBeTruthy();
    expect(screen.getByTestId('pick-library')).toBeTruthy();
    expect(screen.getByTestId('pick-pdf')).toBeTruthy();
    expect(screen.queryByTestId('receipt-submit')).toBeNull();
  });
});

describe('ReceiptDetail', () => {
  it('shows the amount, metadata and the share/delete actions for my private receipt', async () => {
    mockedStore.mockReturnValue({
      isSubmitting: false,
      share: jest.fn(),
      remove: jest.fn(),
      fileUri: jest.fn(async () => 'file:///cache/r1.jpg'),
      all: () => [receipt],
    });
    await render(
      <ReceiptDetail
        receipt={receipt}
        currentUid="u1"
        household={household}
        members={members}
        onBack={jest.fn()}
        onDeleted={jest.fn()}
      />,
    );
    expect(screen.getByText('$12.500')).toBeTruthy();
    expect(screen.getByText('boleta clínica')).toBeTruthy();
    expect(screen.getByText(strings.receipts.private)).toBeTruthy();
    expect(screen.getByTestId('receipt-share-button')).toBeTruthy();
    expect(screen.getByTestId('receipt-delete-button')).toBeTruthy();
  });

  it('hides share/delete for the co-parent on a shared receipt', async () => {
    mockedStore.mockReturnValue({
      isSubmitting: false,
      share: jest.fn(),
      remove: jest.fn(),
      fileUri: jest.fn(async () => 'file:///cache/r1.jpg'),
      all: () => [],
    });
    await render(
      <ReceiptDetail
        receipt={{ ...receipt, visibility: 'shared', sharedAt: 2 }}
        currentUid="u2"
        household={household}
        members={members}
        onBack={jest.fn()}
        onDeleted={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('receipt-share-button')).toBeNull();
    expect(screen.queryByTestId('receipt-delete-button')).toBeNull();
    expect(screen.getByText(strings.receipts.sharedBadge)).toBeTruthy();
  });
});
