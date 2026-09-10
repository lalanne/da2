import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { theme } from '../../theme';
import { Banner, Button, Card, Chip, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import { useReceiptsStore } from '../../store/receiptsStore';
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
}

export function ReceiptDetail({ receipt, currentUid, household, members, onBack, onDeleted }: Props) {
  const d = strings.receipts.detail;
  const store = useReceiptsStore();
  const [uri, setUri] = useState<string | null>(null);
  const [fileError, setFileError] = useState(false);

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

  const onShare = () => {
    Alert.alert(d.share, d.shareConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: d.share, onPress: () => void store.share(receipt.id) },
    ]);
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

      <View style={styles.spacer} />
      {mine && receipt.visibility === 'private' ? (
        <Button
          title={d.share}
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
