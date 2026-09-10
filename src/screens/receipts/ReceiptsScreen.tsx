import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, Chip, ListRow, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { availableMonths, filterReceipts, type TagFilter } from '../../receipts';
import { RECEIPT_TAGS, type Receipt } from '../../models/Receipt';
import { ReceiptUpload } from './ReceiptUpload';
import { ReceiptDetail } from './ReceiptDetail';
import { receiptAmountLabel, receiptSubtitle, tagLabel } from './labels';

type RcView = { name: 'list' } | { name: 'upload' } | { name: 'detail'; receipt: Receipt };

export function ReceiptsScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const store = useReceiptsStore();
  const [view, setView] = useState<RcView>({ name: 'list' });
  const [segment, setSegment] = useState<'mine' | 'shared'>('mine');
  const [tag, setTag] = useState<TagFilter>(null);
  const [month, setMonth] = useState<string | null>(null);

  const base = segment === 'mine' ? store.mine : store.shared;
  const months = useMemo(() => availableMonths(base), [base]);
  const receipts = useMemo(
    () => filterReceipts(base, { tag, month }).sort((a, b) => b.createdAt - a.createdAt),
    [base, tag, month],
  );

  if (!household || !uid) return null;

  if (view.name === 'upload') {
    return (
      <ReceiptUpload
        household={household}
        isSubmitting={store.isSubmitting}
        submitError={store.actionError}
        onSubmit={async (file, meta) => {
          const ok = await store.upload(file, meta);
          if (ok) setView({ name: 'list' });
          return ok;
        }}
        onBack={() => {
          store.clearActionError();
          setView({ name: 'list' });
        }}
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
  const toggleTag = (next: TagFilter) => setTag((v) => (v === next ? null : next));

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <Chip
          label={strings.receipts.filters.allTags}
          selected={tag === null}
          onPress={() => setTag(null)}
        />
        {RECEIPT_TAGS.map((t) => (
          <Chip key={t} label={tagLabel(t)} selected={tag === t} onPress={() => toggleTag(t)} />
        ))}
        <Chip
          label={strings.receipts.uncategorized}
          selected={tag === 'none'}
          onPress={() => toggleTag('none')}
        />
      </ScrollView>

      {months.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip
            label={strings.receipts.filters.allMonths}
            selected={month === null}
            onPress={() => setMonth(null)}
          />
          {months.map((m) => (
            <Chip
              key={m}
              label={m}
              selected={month === m}
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
  filterRowContent: { gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  empty: { marginTop: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
