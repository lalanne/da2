import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSplitStore } from '../../store/splitStore';
import { activeSplit, computeBalance } from '../../split';
import { formatAmount } from '../../receipts';
import { DEFAULT_CURRENCY } from '../../models/Receipt';
import type { Household } from '../../models/Household';
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
    members.find((m) => m.uid !== currentUid)?.displayName ?? strings.custody.theOtherParent;

  if (!table || !bId) {
    return (
      <Card style={styles.card} testID="balance-card">
        <Text variant="body" color="textSecondary">
          {b.needsTable}
        </Text>
        <Button title={b.defineTable} onPress={onDefineTable} testID="balance-define" />
      </Card>
    );
  }

  const { netAOwesB } = computeBalance(shared, settlements, [a, bId]);
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
