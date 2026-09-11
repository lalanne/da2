import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text, TextField } from '../../components';
import { strings } from '../../i18n/strings';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSplitStore } from '../../store/splitStore';
import { buildSettlementInput, receiptShares, type SettlementFormState } from '../../split';
import { formatAmount } from '../../receipts';
import { DEFAULT_CURRENCY } from '../../models/Receipt';
import type { Settlement } from '../../models/Split';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';

interface Props {
  household: Household;
  members: HouseholdMember[];
  currentUid: string;
  onBack: () => void;
  onSplitTable: () => void;
}

export function BalanceDetail({ household, members, currentUid, onBack, onSplitTable }: Props) {
  const d = strings.split.detail;
  const store = useSplitStore();
  const shared = useReceiptsStore((s) => s.shared).filter((r) => r.splitPercentA != null);
  const [recording, setRecording] = useState(false);

  const [a] = household.parentIds;
  const nameFor = (uid: string) =>
    uid === currentUid
      ? strings.household.settings.you
      : members.find((m) => m.uid === uid)?.displayName ?? strings.custody.theOtherParent;
  const other =
    members.find((m) => m.uid !== currentUid)?.uid ?? household.parentIds.find((x) => x !== currentUid) ?? '';

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {d.title}
      </Text>

      <Pressable onPress={onSplitTable} style={styles.tableLink} testID="balance-to-split-table">
        <Text variant="label" color="accent">
          {strings.split.table.title}
        </Text>
        <Text variant="caption" color="textSecondary">
          ›
        </Text>
      </Pressable>

      {recording ? (
        <SettlementForm
          currentUid={currentUid}
          otherUid={other}
          otherName={nameFor(other)}
          onDone={() => setRecording(false)}
          onCancel={() => setRecording(false)}
        />
      ) : (
        <Button
          title={strings.split.settlement.form.title}
          onPress={() => setRecording(true)}
          testID="settlement-open"
        />
      )}

      <Text variant="heading" style={styles.section}>
        {strings.receipts.segments.shared}
      </Text>
      {shared.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {d.empty}
        </Text>
      ) : (
        <Card flush>
          {shared.map((r, i) => {
            const { a: shareA, b: shareB } = receiptShares(r.amount, r.splitPercentA ?? 0);
            const iAmA = currentUid === a;
            const yours = iAmA ? shareA : shareB;
            const paidByMe = r.uploaderId === currentUid;
            return (
              <View key={r.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.receiptRow}>
                  <View style={styles.receiptText}>
                    <Text variant="body">{formatAmount(r.amount, r.currency)}</Text>
                    <Text variant="caption" color="textSecondary">
                      {r.expenseDate} ·{' '}
                      {paidByMe ? d.paidByYou : d.paidBy(nameFor(r.uploaderId))}
                    </Text>
                  </View>
                  <Text variant="caption" color="textSecondary">
                    {d.yourShare(formatAmount(yours, r.currency))}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <Text variant="heading" style={styles.section}>
        {d.settlementsHeading}
      </Text>
      {store.settlements.filter((s) => s.status !== 'cancelled').length === 0 ? (
        <Text variant="body" color="textSecondary">
          {d.noSettlements}
        </Text>
      ) : (
        <Card flush>
          {store.settlements
            .filter((s) => s.status !== 'cancelled')
            .map((s, i) => (
              <View key={s.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <SettlementRow
                  settlement={s}
                  currentUid={currentUid}
                  nameFor={nameFor}
                  onConfirm={() => void store.resolveSettlement(s.id, 'confirmed')}
                  onReject={() => void store.resolveSettlement(s.id, 'rejected')}
                  onCancel={() => void store.cancelSettlement(s.id)}
                  busy={store.isSubmitting}
                />
              </View>
            ))}
        </Card>
      )}

      {store.actionError ? <Banner tone="danger">{store.actionError}</Banner> : null}

      <View style={styles.spacer} />
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function SettlementRow({
  settlement: s,
  currentUid,
  nameFor,
  onConfirm,
  onReject,
  onCancel,
  busy,
}: {
  settlement: Settlement;
  currentUid: string;
  nameFor: (uid: string) => string;
  onConfirm: () => void;
  onReject: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const st = strings.split.settlement;
  const mine = s.recordedBy === currentUid;
  return (
    <View style={styles.settlementRow}>
      <View style={styles.receiptText}>
        <Text variant="body">
          {st.line(nameFor(s.payerUid), nameFor(s.payeeUid), formatAmount(s.amount, s.currency))}
        </Text>
        <Text
          variant="caption"
          color={
            s.status === 'confirmed'
              ? 'success'
              : s.status === 'rejected'
                ? 'danger'
                : 'textSecondary'
          }
        >
          {s.status === 'confirmed'
            ? st.confirmed
            : s.status === 'rejected'
              ? st.rejected
              : mine
                ? st.recordedByYou
                : st.pending}
          {s.note ? ` · ${s.note}` : ''}
        </Text>
      </View>
      {s.status === 'pending' ? (
        <View style={styles.settlementActions}>
          {mine ? (
            <Pressable onPress={onCancel} disabled={busy} hitSlop={8} testID={`settlement-cancel-${s.id}`}>
              <Text variant="caption" color="textSecondary">
                {st.cancel}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={onReject} disabled={busy} hitSlop={8} testID={`settlement-reject-${s.id}`}>
                <Text variant="caption" color="danger">
                  {st.reject}
                </Text>
              </Pressable>
              <Pressable onPress={onConfirm} disabled={busy} hitSlop={8} testID={`settlement-confirm-${s.id}`}>
                <Text variant="caption" color="accent">
                  {st.confirm}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function SettlementForm({
  currentUid,
  otherUid,
  otherName,
  onDone,
  onCancel,
}: {
  currentUid: string;
  otherUid: string;
  otherName: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const f = strings.split.settlement.form;
  const store = useSplitStore();
  const [state, setState] = useState<SettlementFormState>({
    iPaid: true,
    amount: '',
    note: '',
    currency: DEFAULT_CURRENCY,
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const result = buildSettlementInput(state, currentUid, otherUid);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    const ok = await store.recordSettlement(result.value);
    if (ok) onDone();
  };

  return (
    <Card style={styles.form}>
      <Text variant="label">{f.title}</Text>
      <View style={styles.direction}>
        {[true, false].map((iPaid) => (
          <Pressable
            key={String(iPaid)}
            onPress={() => setState((s) => ({ ...s, iPaid }))}
            style={[styles.dirChip, state.iPaid === iPaid && styles.dirChipOn]}
            testID={`settlement-dir-${iPaid ? 'me' : 'them'}`}
          >
            <Text variant="caption" color={state.iPaid === iPaid ? 'accent' : 'textSecondary'}>
              {iPaid ? f.iPaid : f.theyPaid(otherName)}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextField
        label={f.amountLabel}
        value={state.amount}
        onChangeText={(amount) => setState((s) => ({ ...s, amount }))}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        testID="settlement-amount"
      />
      <TextField
        label={f.noteLabel}
        value={state.note}
        onChangeText={(note) => setState((s) => ({ ...s, note }))}
        testID="settlement-note"
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button title={f.submit} onPress={submit} loading={store.isSubmitting} testID="settlement-submit" />
      <Button title={strings.common.cancel} variant="ghost" onPress={onCancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.sm },
  tableLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  section: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  receiptText: { flex: 1, gap: theme.spacing.xs },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  settlementActions: { flexDirection: 'row', gap: theme.spacing.md },
  form: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  direction: { flexDirection: 'row', gap: theme.spacing.sm },
  dirChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: theme.minTouch,
    justifyContent: 'center',
  },
  dirChipOn: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
