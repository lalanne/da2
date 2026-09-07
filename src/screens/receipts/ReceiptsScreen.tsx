import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, ListRow, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { availableMonths, filterReceipts } from '../../receipts';
import { RECEIPT_CATEGORIES, type Receipt, type ReceiptCategory } from '../../models/Receipt';
import { ReceiptUpload } from './ReceiptUpload';
import { ReceiptDetail } from './ReceiptDetail';
import { categoryLabel, receiptAmountLabel, receiptSubtitle } from './labels';

type RcView = { name: 'list' } | { name: 'upload' } | { name: 'detail'; receipt: Receipt };

export function ReceiptsScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const store = useReceiptsStore();
  const [view, setView] = useState<RcView>({ name: 'list' });
  const [segment, setSegment] = useState<'mine' | 'shared'>('mine');
  const [category, setCategory] = useState<ReceiptCategory | null>(null);
  const [month, setMonth] = useState<string | null>(null);

  const base = segment === 'mine' ? store.mine : store.shared;
  const months = useMemo(() => availableMonths(base), [base]);
  const receipts = useMemo(
    () =>
      filterReceipts(base, { category, month }).sort((a, b) => b.createdAt - a.createdAt),
    [base, category, month],
  );

  if (!household || !uid) return null;

  if (view.name === 'upload') {
    return (
      <ReceiptUpload
        household={household}
        isSubmitting={store.isSubmitting}
        onSubmit={async (file, meta) => {
          const ok = await store.upload(file, meta);
          if (ok) setView({ name: 'list' });
          return ok;
        }}
        onBack={() => setView({ name: 'list' })}
      />
    );
  }

  if (view.name === 'detail') {
    const live = store.all().find((r) => r.id === view.receipt.id) ?? view.receipt;
    return (
      <ReceiptDetail
        receipt={live}
        currentUid={uid}
        household={household}
        members={members}
        onBack={() => setView({ name: 'list' })}
        onDeleted={() => setView({ name: 'list' })}
      />
    );
  }

  const emptyText = segment === 'mine' ? strings.receipts.empty.mine : strings.receipts.empty.shared;

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {strings.receipts.tabTitle}
      </Text>

      <View style={styles.segments}>
        {(['mine', 'shared'] as const).map((seg) => (
          <Pressable
            key={seg}
            testID={`receipts-segment-${seg}`}
            onPress={() => setSegment(seg)}
            style={[styles.segment, segment === seg && styles.segmentActive]}
          >
            <Text variant="label" color={segment === seg ? 'accent' : 'textSecondary'}>
              {strings.receipts.segments[seg]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <FilterChip
          label={strings.receipts.filters.allCategories}
          active={category === null}
          onPress={() => setCategory(null)}
        />
        {RECEIPT_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={categoryLabel(c)}
            active={category === c}
            onPress={() => setCategory((v) => (v === c ? null : c))}
          />
        ))}
      </ScrollView>

      {months.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <FilterChip
            label={strings.receipts.filters.allMonths}
            active={month === null}
            onPress={() => setMonth(null)}
          />
          {months.map((m) => (
            <FilterChip
              key={m}
              label={m}
              active={month === m}
              onPress={() => setMonth((v) => (v === m ? null : m))}
            />
          ))}
        </ScrollView>
      ) : null}

      {receipts.length === 0 ? (
        <Text variant="body" color="textSecondary" style={styles.empty}>
          {emptyText}
        </Text>
      ) : (
        <Card flush>
          {receipts.map((r, i) => (
            <View key={r.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                title={receiptAmountLabel(r)}
                subtitle={receiptSubtitle(r, household)}
                trailing={
                  <Text
                    variant="caption"
                    color={r.visibility === 'shared' ? 'success' : 'textFaint'}
                  >
                    {r.visibility === 'shared'
                      ? strings.receipts.sharedBadge
                      : strings.receipts.private}
                  </Text>
                }
                onPress={() => setView({ name: 'detail', receipt: r })}
                testID={`receipt-row-${r.id}`}
              />
            </View>
          ))}
        </Card>
      )}

      <View style={styles.spacer} />
      <Button
        title={strings.receipts.add}
        onPress={() => setView({ name: 'upload' })}
        testID="receipts-add-button"
      />
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text variant="caption" color={active ? 'accent' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.md },
  segments: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: theme.minTouch,
    justifyContent: 'center',
  },
  segmentActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  filterRow: { marginBottom: theme.spacing.sm },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  filterChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  empty: { marginTop: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
