import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Banner, Button, Card, Screen, Text } from '../components';
import { strings } from '../i18n/strings';
import { useAuthStore } from '../store/authStore';
import { useHouseholdStore } from '../store/householdStore';
import { useCustodyStore } from '../store/custodyStore';
import { useSplitStore } from '../store/splitStore';
import { needsReview } from '../solo';
import { describeProposal } from './calendar/labels';

interface Props {
  onBack: () => void;
  /** Jump to the screen that owns this decision, to counter-propose there. */
  onOpenCalendar: () => void;
  onOpenSplitTable: () => void;
}

/**
 * Spec 015 — everything a newly-joined co-parent should look at: decisions
 * the solo parent made unilaterally, not yet accepted. Purely a read + jump-
 * off point; accepting happens here directly (touches only `acknowledgedBy`),
 * counter-proposing hands off to the screen that owns that flow already.
 */
export function ReviewQueueScreen({ onBack, onOpenCalendar, onOpenSplitTable }: Props) {
  const r = strings.solo.review;
  const uid = useAuthStore((s) => s.user?.uid);
  const { household, members } = useHouseholdStore();
  const custody = useCustodyStore();
  const split = useSplitStore();

  if (!household || !uid) return null;

  const custodyItems = needsReview(custody.proposals, uid);
  const splitItems = needsReview(split.proposals, uid);
  const total = custodyItems.length + splitItems.length;

  return (
    <Screen scroll testID="review-queue-screen">
      <Text variant="title" style={styles.title}>
        {r.title}
      </Text>

      {total === 0 ? (
        <Text variant="body" color="textSecondary">
          {r.empty}
        </Text>
      ) : (
        <>
          <Banner tone="info">{r.intro}</Banner>

          {custodyItems.map((p) => (
            <Card key={p.id} style={styles.item} testID={`review-item-custody-${p.id}`}>
              <Text variant="label">{p.type === 'pattern' ? r.pattern : r.dayOverride}</Text>
              <Text variant="body" color="textSecondary">
                {describeProposal(p, household, members)}
              </Text>
              <Text variant="caption" color="textFaint">
                {r.decidedBy(
                  members.find((m) => m.uid === p.proposerId)?.displayName ??
                    household.coParentName ??
                    strings.custody.theOtherParent,
                )}
              </Text>
              <View style={styles.actions}>
                <Button
                  title={r.accept}
                  onPress={() => void custody.acknowledge(p.id)}
                  disabled={custody.isSubmitting}
                  testID={`review-accept-custody-${p.id}`}
                />
                <Button
                  title={r.proposeDifferent}
                  variant="ghost"
                  onPress={onOpenCalendar}
                  testID={`review-propose-custody-${p.id}`}
                />
              </View>
            </Card>
          ))}

          {splitItems.map((p) => (
            <Card key={p.id} style={styles.item} testID={`review-item-split-${p.id}`}>
              <Text variant="label">{r.splitTable}</Text>
              <Text variant="body" color="textSecondary">
                {strings.split.table.byDefault}: {p.defaultPercentA}% / {100 - p.defaultPercentA}%
              </Text>
              <Text variant="caption" color="textFaint">
                {r.decidedBy(
                  members.find((m) => m.uid === p.proposerId)?.displayName ??
                    household.coParentName ??
                    strings.custody.theOtherParent,
                )}
              </Text>
              <View style={styles.actions}>
                <Button
                  title={r.accept}
                  onPress={() => void split.acknowledgeProposal(p.id)}
                  disabled={split.isSubmitting}
                  testID={`review-accept-split-${p.id}`}
                />
                <Button
                  title={r.proposeDifferent}
                  variant="ghost"
                  onPress={onOpenSplitTable}
                  testID={`review-propose-split-${p.id}`}
                />
              </View>
            </Card>
          ))}
        </>
      )}

      <View style={styles.spacer} />
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.md },
  item: { gap: theme.spacing.xs, marginTop: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
