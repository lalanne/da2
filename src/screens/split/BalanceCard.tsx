import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSplitStore } from '../../store/splitStore';
import { activeSplit } from '../../split';
import { computeBalanceSegments } from '../../solo';
import { formatAmount } from '../../receipts';
import { DEFAULT_CURRENCY } from '../../models/Receipt';
import { ABSENT_CO_PARENT, type Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';

interface Props {
  household: Household;
  members: HouseholdMember[];
  currentUid: string;
  onRecordPayment: () => void;
  onDetail: () => void;
  onDefineTable: () => void;
}

export function BalanceCard({
  household,
  members,
  currentUid,
  onRecordPayment,
  onDetail,
  onDefineTable,
}: Props) {
  const b = strings.split.balance;
  const proposals = useSplitStore((s) => s.proposals);
  const settlements = useSplitStore((s) => s.settlements);
  const shared = useReceiptsStore((s) => s.shared);
  const table = activeSplit(proposals);

  const [a, bId] = household.parentIds;
  const otherName =
    members.find((m) => m.uid !== currentUid)?.displayName ??
    household.coParentName ??
    strings.custody.theOtherParent;

  if (!table) {
    return (
      <Card style={styles.card} testID="balance-card">
        <Text variant="body" color="textSecondary">
          {b.needsTable}
        </Text>
        <Button title={b.defineTable} onPress={onDefineTable} testID="balance-define" />
      </Card>
    );
  }

  // Spec 015: pair with the ABSENT_CO_PARENT sentinel while solo — the two
  // segments collapse to one total here (the full breakdown lives in
  // BalanceDetail); computeBalance() alone would drop solo-period
  // settlements silently, since their payer/payee never matches `bId === undefined`.
  const segments = computeBalanceSegments(
    shared,
    settlements,
    [a, bId ?? ABSENT_CO_PARENT],
    household.coParentJoinedAt,
  );
  const netAOwesB = (segments.solo?.netAOwesB ?? 0) + segments.agreed.netAOwesB;
  const iAmA = currentUid === a;
  const youOwe = iAmA ? netAOwesB : -netAOwesB; // > 0 → you owe the other

  let line: string;
  if (youOwe === 0) line = b.settled;
  else if (youOwe > 0) line = b.youOwe(otherName, formatAmount(youOwe, DEFAULT_CURRENCY));
  else line = b.owes(otherName, formatAmount(-youOwe, DEFAULT_CURRENCY));

  return (
    <Card style={styles.card} testID="balance-card">
      <Text variant="display" align="center" testID="balance-line">
        {youOwe === 0 ? b.settled : formatAmount(Math.abs(youOwe), DEFAULT_CURRENCY)}
      </Text>
      {youOwe !== 0 ? (
        <Text variant="caption" color="textSecondary" align="center">
          {line}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title={b.recordPayment} onPress={onRecordPayment} testID="balance-record" />
        </View>
        <View style={styles.action}>
          <Button
            title={b.seeDetail}
            variant="secondary"
            onPress={onDetail}
            testID="balance-detail"
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  action: { flex: 1 },
});
