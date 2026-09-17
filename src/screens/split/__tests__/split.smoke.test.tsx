import { fireEvent, render, screen } from '@testing-library/react-native';
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
    acknowledgeProposal: jest.fn(),
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

// Spec 015 — solo parent.
describe('solo parent', () => {
  const soloHousehold: Household = {
    ...household,
    parentIds: ['u1'],
    coParentName: 'Cristián',
    coParentJoinedAt: null,
  };
  const joinedHousehold: Household = {
    ...household,
    coParentJoinedAt: 1_700_000_050_000,
  };
  const selfApproved: SplitProposal = {
    ...approved,
    id: 'solo-p1',
    resolvedBy: 'u1', // == proposerId — self-approved while solo
    acknowledgedBy: null,
  };

  it('BalanceCard shows a figure while solo, against the absent co-parent', async () => {
    mockedSplit.mockImplementation(
      pick(
        splitState({
          proposals: [selfApproved],
          settlements: [
            {
              id: 's1',
              recordedBy: 'u1',
              status: 'confirmed',
              payerUid: '__coparent__',
              payeeUid: 'u1',
              amount: 5000,
              currency: 'CLP',
              note: null,
              createdAt: 1,
              resolvedAt: 1,
              resolvedBy: 'u1',
            },
          ],
        }),
      ),
    );
    await render(
      <BalanceCard
        household={soloHousehold}
        members={[{ uid: 'u1', displayName: 'Javiera', isYou: true }]}
        currentUid="u1"
        onRecordPayment={cb}
        onDetail={cb}
        onDefineTable={cb}
      />,
    );
    // The absent co-parent "paid" u1 5000 → u1 owes Cristián that much.
    expect(screen.getByTestId('balance-line')).toHaveTextContent('$5.000');
  });

  it('SplitTableView shows the provisional badge and lets the newcomer accept', async () => {
    const acknowledgeProposal = jest.fn();
    mockedSplit.mockImplementation(
      pick(splitState({ proposals: [selfApproved], acknowledgeProposal })),
    );
    await render(
      <SplitTableView
        household={joinedHousehold}
        members={members}
        currentUid="u2" // the newcomer, not the proposer
        onPropose={cb}
        onBack={cb}
      />,
    );

    expect(screen.getByTestId('split-provisional-badge')).toBeTruthy();
    expect(screen.getByTestId('split-acknowledge')).toBeTruthy();
    expect(screen.getByTestId('split-propose-different')).toBeTruthy();

    fireEvent.press(screen.getByTestId('split-acknowledge'));
    expect(acknowledgeProposal).toHaveBeenCalledWith('solo-p1');
  });

  it('SplitTableView hides the badge/actions for the proposer themselves', async () => {
    mockedSplit.mockImplementation(pick(splitState({ proposals: [selfApproved] })));
    await render(
      <SplitTableView
        household={joinedHousehold}
        members={members}
        currentUid="u1" // the proposer
        onPropose={cb}
        onBack={cb}
      />,
    );

    expect(screen.getByTestId('split-provisional-badge')).toBeTruthy();
    expect(screen.queryByTestId('split-acknowledge')).toBeNull();
  });

  it('SplitTableView shows no badge once acknowledged', async () => {
    mockedSplit.mockImplementation(
      pick(splitState({ proposals: [{ ...selfApproved, acknowledgedBy: 'u2' }] })),
    );
    await render(
      <SplitTableView
        household={joinedHousehold}
        members={members}
        currentUid="u2"
        onPropose={cb}
        onBack={cb}
      />,
    );
    expect(screen.queryByTestId('split-provisional-badge')).toBeNull();
  });

  it('BalanceDetail renders two labelled segments once solo-period settlements meet a join', async () => {
    mockedSplit.mockImplementation(
      pick(
        splitState({
          proposals: [selfApproved],
          settlements: [
            {
              id: 's1',
              recordedBy: 'u1',
              status: 'confirmed',
              payerUid: '__coparent__',
              payeeUid: 'u1',
              amount: 3000,
              currency: 'CLP',
              note: null,
              createdAt: 1,
              resolvedAt: 1,
              resolvedBy: 'u1',
            },
          ],
        }),
      ),
    );
    await render(
      <BalanceDetail
        household={joinedHousehold}
        members={members}
        currentUid="u1"
        onBack={cb}
        onSplitTable={cb}
      />,
    );
    expect(screen.getByTestId('balance-segments')).toBeTruthy();
    expect(screen.getByTestId('balance-segment-solo')).toBeTruthy();
    expect(screen.getByTestId('balance-segment-agreed')).toBeTruthy();
  });

  it('BalanceDetail shows one figure (no segments) for an always-two-parent household', async () => {
    await render(
      <BalanceDetail
        household={household}
        members={members}
        currentUid="u1"
        onBack={cb}
        onSplitTable={cb}
      />,
    );
    expect(screen.queryByTestId('balance-segments')).toBeNull();
  });
});
