import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import {
  Button,
  Card,
  FilterTabs,
  ListRow,
  Screen,
  Text,
  WebDialog,
  type FilterTabOption,
} from '../../components';
import { strings } from '../../i18n/strings';
import { useAuthStore } from '../../store/authStore';
import { useHouseholdStore } from '../../store/householdStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { availableMonths, filterReceipts, type TagFilter } from '../../receipts';
import { RECEIPT_TAGS, type Receipt } from '../../models/Receipt';
import { ReceiptUpload } from './ReceiptUpload';
import { ReceiptDetail } from './ReceiptDetail';
import { BalanceCard } from '../split/BalanceCard';
import { BalanceDetail } from '../split/BalanceDetail';
import { SplitTableView } from '../split/SplitTableView';
import { SplitProposeForm } from '../split/SplitProposeForm';
import { useSplitStore } from '../../store/splitStore';
import { activeSplit } from '../../split';
import { useWideWeb } from '../../web/useWideWeb';
import { receiptAmountLabel, receiptSubtitle, tagLabel } from './labels';

type RcView =
  | { name: 'list' }
  | { name: 'upload' }
  | { name: 'detail'; receipt: Receipt }
  | { name: 'balance' }
  | { name: 'split-table' }
  | { name: 'split-propose' };

export function ReceiptsScreen() {
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const store = useReceiptsStore();
  const splitProposals = useSplitStore((s) => s.proposals);
  const [view, setView] = useState<RcView>({ name: 'list' });
  const [segment, setSegment] = useState<'mine' | 'shared'>('mine');
  const [tag, setTag] = useState<TagFilter>(null);
  const [month, setMonth] = useState<string | null>(null);
  const wideWeb = useWideWeb();

  const base = segment === 'mine' ? store.mine : store.shared;
  const months = useMemo(() => availableMonths(base), [base]);
  const receipts = useMemo(
    () => filterReceipts(base, { tag, month }).sort((a, b) => b.createdAt - a.createdAt),
    [base, tag, month],
  );

  const tagOptions = useMemo<FilterTabOption<TagFilter>[]>(
    () => [
      { value: null, label: strings.receipts.filters.allTags },
      ...RECEIPT_TAGS.map((t) => ({ value: t, label: tagLabel(t) })),
      { value: 'none' as const, label: strings.receipts.uncategorized },
    ],
    [],
  );
  const monthOptions = useMemo<FilterTabOption<string | null>[]>(
    () => [
      { value: null, label: strings.receipts.filters.allMonths },
      ...months.map((m) => ({ value: m, label: m })),
    ],
    [months],
  );

  if (!household || !uid) return null;

  // Spec 012: upload, balance detail and the split-table flow are all
  // "push" views — a WebDialog over the list on wide web, full-screen
  // everywhere else. `detail` is handled separately below (master-detail).
  function renderPush(): ReactElement | null {
    if (view.name === 'upload') {
      return (
        <ReceiptUpload
          household={household!}
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

    if (view.name === 'balance') {
      return (
        <BalanceDetail
          household={household!}
          members={members}
          currentUid={uid!}
          onBack={() => setView({ name: 'list' })}
          onSplitTable={() => setView({ name: 'split-table' })}
        />
      );
    }

    if (view.name === 'split-table') {
      return (
        <SplitTableView
          household={household!}
          members={members}
          currentUid={uid!}
          onPropose={() => setView({ name: 'split-propose' })}
          onBack={() => setView({ name: 'list' })}
        />
      );
    }

    if (view.name === 'split-propose') {
      return (
        <SplitProposeForm
          household={household!}
          members={members}
          currentUid={uid!}
          initial={activeSplit(splitProposals)}
          onDone={() => setView({ name: 'split-table' })}
          onBack={() => setView({ name: 'split-table' })}
        />
      );
    }

    return null;
  }

  const pushContent = renderPush();

  if (!wideWeb && pushContent) {
    return pushContent;
  }

  if (!wideWeb && view.name === 'detail') {
    const live = store.all().find((r) => r.id === view.receipt.id) ?? view.receipt;
    return (
      <ReceiptDetail
        receipt={live}
        currentUid={uid}
        household={household}
        members={members}
        onBack={() => setView({ name: 'list' })}
        onDeleted={() => setView({ name: 'list' })}
        onNeedSplitTable={() => setView({ name: 'split-table' })}
      />
    );
  }

  const emptyText = segment === 'mine' ? strings.receipts.empty.mine : strings.receipts.empty.shared;

  const list = (
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

      <View style={styles.filterRow}>
        <FilterTabs
          options={tagOptions}
          value={tag}
          onChange={setTag}
          testID="receipts-tag-filter"
        />
      </View>

      {months.length > 0 ? (
        <View style={styles.filterRow}>
          <FilterTabs
            options={monthOptions}
            value={month}
            onChange={setMonth}
            testID="receipts-month-filter"
          />
        </View>
      ) : null}

      {segment === 'shared' ? (
        <BalanceCard
          household={household}
          members={members}
          currentUid={uid}
          onRecordPayment={() => setView({ name: 'balance' })}
          onDetail={() => setView({ name: 'balance' })}
          onDefineTable={() => setView({ name: 'split-table' })}
        />
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
                selected={wideWeb && view.name === 'detail' && view.receipt.id === r.id}
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

  if (!wideWeb) {
    return list;
  }

  // Spec 012: wide web is a master-detail split — the list (with the
  // balance card pinned atop it on Compartidos) stays in the left column,
  // the selected receipt's detail fills the right one.
  const liveDetail =
    view.name === 'detail' ? (store.all().find((r) => r.id === view.receipt.id) ?? view.receipt) : null;

  return (
    <View style={styles.masterDetail}>
      <View style={styles.master}>{list}</View>
      <View style={styles.detail} testID="receipts-detail-pane">
        {liveDetail ? (
          <ReceiptDetail
            receipt={liveDetail}
            currentUid={uid}
            household={household}
            members={members}
            onBack={() => setView({ name: 'list' })}
            onDeleted={() => setView({ name: 'list' })}
            onNeedSplitTable={() => setView({ name: 'split-table' })}
          />
        ) : (
          <View style={styles.detailEmpty}>
            <Text variant="body" color="textSecondary">
              {strings.receipts.tabTitle}
            </Text>
          </View>
        )}
      </View>

      <WebDialog
        visible={!!pushContent}
        onRequestClose={() =>
          setView(view.name === 'split-propose' ? { name: 'split-table' } : { name: 'list' })
        }
        testID="receipts-dialog"
      >
        {pushContent}
      </WebDialog>
    </View>
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
  filterRow: { marginBottom: theme.spacing.md },
  empty: { marginTop: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
  masterDetail: { flex: 1, flexDirection: 'row' },
  master: { width: 400, flexShrink: 0, borderRightWidth: 1, borderRightColor: theme.colors.border },
  detail: { flex: 1 },
  detailEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
