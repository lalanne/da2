import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { theme } from '../../theme';
import { Banner, Button, Card, Chip, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSplitStore } from '../../store/splitStore';
import { activeSplit, receiptShares, resolveSplitPercent } from '../../split';
import { formatAmount } from '../../receipts';
import type { Receipt } from '../../models/Receipt';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { receiptAmountLabel, receiptChildLabel, tagLabel } from './labels';

interface Props {
  receipt: Receipt;
  currentUid: string;
  household: Household;
  members: HouseholdMember[];
  onBack: () => void;
  onDeleted: () => void;
  /** Sharing is blocked until a split table is agreed — jump the user there. */
  onNeedSplitTable: () => void;
}

export function ReceiptDetail({
  receipt,
  currentUid,
  household,
  members,
  onBack,
  onDeleted,
  onNeedSplitTable,
}: Props) {
  const d = strings.receipts.detail;
  const store = useReceiptsStore();
  const proposals = useSplitStore((s) => s.proposals);
  const table = activeSplit(proposals);
  const [uri, setUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store.fileUri(receipt).then((result) => {
      if (cancelled) return;
      if (result) setUri(result);
      else setFileError(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.id, receipt.storagePath]);

  const mine = receipt.uploaderId === currentUid;
  const uploader = members.find((m) => m.uid === receipt.uploaderId);
  const child = receiptChildLabel(receipt, household);

  const parentA = household.parentIds[0];
  const otherName =
    members.find((m) => m.uid !== currentUid)?.displayName ?? strings.custody.theOtherParent;

  const doShare = (percentA: number) => {
    Alert.alert(d.share, d.shareConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: d.share, onPress: () => void store.share(receipt.id, percentA) },
    ]);
  };

  const onShare = () => {
    if (!table) {
      onNeedSplitTable();
      return;
    }
    const r = resolveSplitPercent(table, receipt.tags);
    if (r.needsPick) {
      setChoosing(true);
      return;
    }
    doShare(r.percentA ?? table.defaultPercentA);
  };

  const onDelete = () => {
    Alert.alert(d.delete, d.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: d.delete,
        style: 'destructive',
        onPress: async () => {
          const ok = await store.remove(receipt);
          if (ok) onDeleted();
        },
      },
    ]);
  };

  // The frozen split, for a shared receipt.
  let splitRow: { you: string; other: string } | null = null;
  if (receipt.visibility === 'shared' && receipt.splitPercentA != null) {
    const { a, b } = receiptShares(receipt.amount, receipt.splitPercentA);
    const iAmA = currentUid === parentA;
    const yourShare = iAmA ? a : b;
    const yourPct = iAmA ? receipt.splitPercentA : 100 - receipt.splitPercentA;
    splitRow = {
      you: strings.split.receiptRow.you(formatAmount(yourShare, receipt.currency), yourPct),
      other: strings.split.receiptRow.other(
        otherName,
        formatAmount(receipt.amount - yourShare, receipt.currency),
        100 - yourPct,
      ),
    };
  }

  const choices = table ? resolveSplitPercent(table, receipt.tags).choices : [];

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {receiptAmountLabel(receipt)}
      </Text>

      <View style={styles.file}>
        {fileError ? (
          <Banner tone="danger">{d.fileError}</Banner>
        ) : uri == null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text variant="caption" color="textSecondary">
              {d.loadingFile}
            </Text>
          </View>
        ) : receipt.fileType === 'image' ? (
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Button title={d.openPdf} onPress={() => void Sharing.shareAsync(uri)} testID="open-pdf" />
        )}
      </View>

      <Card style={styles.meta}>
        <View style={styles.row}>
          <Text variant="caption" color="textSecondary">
            {strings.receipts.detail.tagsLabel}
          </Text>
          {receipt.tags.length === 0 ? (
            <Text variant="body">{strings.receipts.uncategorized}</Text>
          ) : (
            <View style={styles.tags}>
              {receipt.tags.map((t) => (
                <Chip key={t} label={tagLabel(t)} />
              ))}
            </View>
          )}
        </View>
        <Row label={strings.receipts.form.dateLabel} value={receipt.expenseDate} />
        {child ? <Row label={strings.receipts.form.childLabel} value={child} /> : null}
        {receipt.note ? <Text variant="body">{receipt.note}</Text> : null}
        {splitRow ? (
          <View style={styles.row}>
            <Text variant="caption" color="textSecondary">
              {strings.split.receiptRow.heading}
            </Text>
            <Text variant="body">{splitRow.you}</Text>
            <Text variant="caption" color="textSecondary">
              {splitRow.other}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" color="textFaint">
          {mine ? d.uploadedByYou : d.uploadedBy(uploader?.displayName ?? '—')}
        </Text>
        <View style={styles.badgeRow}>
          <Text variant="caption" color={receipt.visibility === 'shared' ? 'success' : 'textSecondary'}>
            {receipt.visibility === 'shared'
              ? strings.receipts.sharedBadge
              : strings.receipts.private}
          </Text>
        </View>
      </Card>

      {store.actionError ? (
        <Banner tone="danger" testID="receipt-detail-error">
          {store.actionError}
        </Banner>
      ) : null}

      {choosing ? (
        <Card style={styles.meta}>
          <Text variant="label">{strings.split.share.chooseRule}</Text>
          <View style={styles.tags}>
            {choices.map((c) => (
              <Chip
                key={c.tag}
                testID={`share-rule-${c.tag}`}
                label={strings.split.share.rule(tagLabel(c.tag), c.percentA, 100 - c.percentA)}
                onPress={() => {
                  setChoosing(false);
                  doShare(c.percentA);
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <View style={styles.spacer} />
      {mine && receipt.visibility === 'private' ? (
        <Button
          title={table ? d.share : strings.split.balance.defineTable}
          onPress={onShare}
          disabled={store.isSubmitting}
          testID="receipt-share-button"
        />
      ) : null}
      {mine && receipt.visibility === 'private' ? (
        <Button
          title={d.delete}
          variant="danger"
          onPress={onDelete}
          disabled={store.isSubmitting}
          testID="receipt-delete-button"
        />
      ) : null}
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  file: { marginBottom: theme.spacing.lg },
  loading: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSunken,
  },
  meta: { gap: theme.spacing.md },
  row: { gap: theme.spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  badgeRow: { flexDirection: 'row' },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
