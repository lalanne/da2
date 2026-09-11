import { render, screen } from '@testing-library/react-native';
import { BalanceCard } from '../BalanceCard';
import { BalanceDetail } from '../BalanceDetail';
import { SplitTableView } from '../SplitTableView';
import { SplitProposeForm } from '../SplitProposeForm';
import { useSplitStore } from '../../../store/splitStore';
import { useReceiptsStore } from '../../../store/receiptsStore';
import { strings } from '../../../i18n/strings';
import type { Household } from '../../../models/Household';
import type { SplitProposal } from '../../../models/Split';

jest.mock('../../../store/splitStore', () => ({ useSplitStore: jest.fn() }));
jest.mock('../../../store/receiptsStore', () => ({ useReceiptsStore: jest.fn() }));

const mockedSplit = useSplitStore as unknown as jest.Mock;
const mockedReceipts = useReceiptsStore as unknown as jest.Mock;

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
const approved: SplitProposal = {
  id: 'p1',
  proposerId: 'u1',
  status: 'approved',
  createdAt: 1_700_000_000_000,
  resolvedAt: 1_700_000_100_000,
  resolvedBy: 'u2',
  defaultPercentA: 40,
  overrides: { medical: 50 },
};

function splitState(over: Record<string, unknown> = {}) {
  return {
    proposals: [approved],
    settlements: [],
    isSubmitting: false,
    actionError: null,
    propose: jest.fn(),
    resolveProposal: jest.fn(),
    cancelProposal: jest.fn(),
    recordSettlement: jest.fn(),
    resolveSettlement: jest.fn(),
    cancelSettlement: jest.fn(),
    ...over,
  };
}

const pick = <T,>(state: T) => (sel?: (s: T) => unknown) => (sel ? sel(state) : state);

beforeEach(() => {
  mockedSplit.mockImplementation(pick(splitState()));
  mockedReceipts.mockImplementation(pick({ shared: [], all: () => [] }));
});

const cb = jest.fn();

it('BalanceCard shows "settled" and the two actions with an active table', async () => {
  await render(
    <BalanceCard
      household={household}
      members={members}
      currentUid="u1"
      onRecordPayment={cb}
      onDetail={cb}
      onDefineTable={cb}
    />,
  );
  expect(screen.getByTestId('balance-line')).toHaveTextContent(strings.split.balance.settled);
  expect(screen.getByTestId('balance-record')).toBeTruthy();
  expect(screen.getByTestId('balance-detail')).toBeTruthy();
});

it('BalanceCard prompts to define the table when there is none', async () => {
  mockedSplit.mockImplementation(pick(splitState({ proposals: [] })));
  await render(
    <BalanceCard
      household={household}
      members={members}
      currentUid="u1"
      onRecordPayment={cb}
      onDetail={cb}
      onDefineTable={cb}
    />,
  );
  expect(screen.getByTestId('balance-define')).toBeTruthy();
});

it('SplitTableView renders the active table and the propose button', async () => {
  await render(
    <SplitTableView
      household={household}
      members={members}
      currentUid="u1"
      onPropose={cb}
      onBack={cb}
    />,
  );
  expect(screen.getByText(strings.split.table.byDefault)).toBeTruthy();
  expect(screen.getByTestId('split-propose')).toBeTruthy();
});

it('SplitTableView shows approve/reject for the non-proposer on a pending proposal', async () => {
  mockedSplit.mockImplementation(
    pick(
      splitState({
        proposals: [approved, { ...approved, id: 'p2', status: 'pending', proposerId: 'u2', createdAt: 2 }],
      }),
    ),
  );
  await render(
    <SplitTableView
      household={household}
      members={members}
      currentUid="u1"
      onPropose={cb}
      onBack={cb}
    />,
  );
  expect(screen.getByTestId('split-approve')).toBeTruthy();
  expect(screen.getByTestId('split-reject')).toBeTruthy();
});

it('SplitProposeForm renders steppers for the default and each existing rule', async () => {
  await render(
    <SplitProposeForm
      household={household}
      members={members}
      currentUid="u1"
      initial={{ defaultPercentA: 40, overrides: { medical: 50 } }}
      onDone={cb}
      onBack={cb}
    />,
  );
  expect(screen.getByTestId('split-default-plus')).toBeTruthy();
  expect(screen.getByTestId('split-rule-medical-minus')).toBeTruthy();
  expect(screen.getByTestId('split-submit')).toBeTruthy();
});

it('BalanceDetail renders the record-payment entry and the empty states', async () => {
  await render(
    <BalanceDetail
      household={household}
      members={members}
      currentUid="u1"
      onBack={cb}
      onSplitTable={cb}
    />,
  );
  expect(screen.getByTestId('settlement-open')).toBeTruthy();
  expect(screen.getByText(strings.split.detail.noSettlements)).toBeTruthy();
});
