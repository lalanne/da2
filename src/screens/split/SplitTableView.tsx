import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useSplitStore } from '../../store/splitStore';
import { activeSplit, pendingSplitProposal } from '../../split';
import { formatCivilDate } from '../../i18n/dates';
import { fromDayNumber } from '../../custody';
import { RECEIPT_TAGS } from '../../models/Receipt';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { tagLabel } from '../receipts/labels';

interface Props {
  household: Household;
  members: HouseholdMember[];
  currentUid: string;
  onPropose: () => void;
  onBack: () => void;
}

export function SplitTableView({ household, members, currentUid, onPropose, onBack }: Props) {
  const t = strings.split.table;
  const store = useSplitStore();
  const table = activeSplit(store.proposals);
  const pending = pendingSplitProposal(store.proposals);

  const nameFor = (uid: string | null) =>
    members.find((m) => m.uid === uid)?.displayName ?? strings.custody.theOtherParent;
  const nameA = nameFor(household.parentIds[0]);
  const nameB = nameFor(household.parentIds[1] ?? null);

  const activeProposal = store.proposals
    .filter((p) => p.status === 'approved')
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const mineIsPending = pending?.proposerId === currentUid;

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {t.title}
      </Text>

      <View style={styles.legend}>
        <Legend color={theme.colors.parentA} name={nameA} />
        <Legend color={theme.colors.parentB} name={nameB} />
      </View>

      {pending ? (
        <Card style={styles.pending}>
          <Text variant="body">
            {mineIsPending
              ? strings.split.pendingBanner.forProposer
              : strings.split.pendingBanner.forResponder(nameFor(pending.proposerId))}
          </Text>
          <SplitRows table={pending} nameA={nameA} nameB={nameB} />
          {mineIsPending ? (
            <Button
              title={strings.split.pendingBanner.cancel}
              variant="ghost"
              onPress={() => void store.cancelProposal(pending.id)}
              disabled={store.isSubmitting}
              testID="split-cancel"
            />
          ) : (
            <View style={styles.actions}>
              <Button
                title={strings.split.pendingBanner.approve}
                onPress={() => void store.resolveProposal(pending.id, 'approved')}
                disabled={store.isSubmitting}
                testID="split-approve"
              />
              <Button
                title={strings.split.pendingBanner.reject}
                variant="danger"
                onPress={() => void store.resolveProposal(pending.id, 'rejected')}
                disabled={store.isSubmitting}
                testID="split-reject"
              />
            </View>
          )}
        </Card>
      ) : null}

      {table ? (
        <Card style={styles.card}>
          <SplitRows table={table} nameA={nameA} nameB={nameB} showAllTags />
        </Card>
      ) : (
        <Banner tone="info">{t.notSet}</Banner>
      )}

      {table && activeProposal ? (
        <Text variant="caption" color="textFaint" style={styles.since}>
          {t.activeSince(
            formatCivilDate(fromDayNumber(Math.floor(activeProposal.createdAt / 86_400_000))),
            nameFor(activeProposal.resolvedBy),
          )}
        </Text>
      ) : null}

      {store.actionError ? <Banner tone="danger">{store.actionError}</Banner> : null}

      <View style={styles.spacer} />
      {!pending ? (
        <Button
          title={table ? t.propose : t.proposeFirst}
          onPress={onPropose}
          testID="split-propose"
        />
      ) : null}
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function SplitRows({
  table,
  nameA,
  nameB,
  showAllTags = false,
}: {
  table: { defaultPercentA: number; overrides: Partial<Record<string, number>> };
  nameA: string;
  nameB: string;
  showAllTags?: boolean;
}) {
  const rows: { label: string; a: number | null }[] = [
    { label: strings.split.table.byDefault, a: table.defaultPercentA },
    ...RECEIPT_TAGS.filter((t) => showAllTags || table.overrides[t] != null).map((t) => ({
      label: tagLabel(t),
      a: table.overrides[t] ?? null,
    })),
  ];
  return (
    <View style={styles.rows}>
      {rows.map((r, i) => (
        <View key={i} style={styles.splitRow}>
          <Text variant="body" color={r.a == null ? 'textFaint' : 'textPrimary'}>
            {r.label}
          </Text>
          {r.a == null ? (
            <Text variant="caption" color="textFaint">
              {strings.split.table.usesDefault}
            </Text>
          ) : (
            <Text variant="caption" color="textSecondary">
              {nameA} {r.a}% · {nameB} {100 - r.a}%
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function Legend({ color, name }: { color: string; name: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" color="textSecondary">
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.md },
  legend: { flexDirection: 'row', gap: theme.spacing.lg, marginBottom: theme.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  dot: { width: 8, height: 8, borderRadius: theme.radius.pill },
  pending: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  card: { gap: theme.spacing.sm },
  rows: { gap: theme.spacing.sm },
  splitRow: { gap: 2 },
  actions: { gap: theme.spacing.sm },
  since: { marginTop: theme.spacing.sm },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
