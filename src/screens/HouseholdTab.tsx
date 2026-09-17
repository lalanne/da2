import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCustodyStore } from '../store/custodyStore';
import { useSplitStore } from '../store/splitStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Banner, Button, Screen, Text } from '../components';
import { needsReview } from '../solo';
import { HouseholdPanel } from './HouseholdPanel';
import { ReviewQueueScreen } from './ReviewQueueScreen';

interface Props {
  /** Spec 015 — the review queue's "propose different" hands off to the tab that owns that flow. */
  onOpenTab?: (tab: 'calendar' | 'receipts') => void;
}

export function HouseholdTab({ onOpenTab }: Props) {
  const { user, signOut } = useAuthStore();
  const custodyProposals = useCustodyStore((s) => s.proposals);
  const splitProposals = useSplitStore((s) => s.proposals);
  const [showReview, setShowReview] = useState(false);

  const reviewCount = user
    ? needsReview(custodyProposals, user.uid).length + needsReview(splitProposals, user.uid).length
    : 0;

  if (showReview) {
    return (
      <ReviewQueueScreen
        onBack={() => setShowReview(false)}
        onOpenCalendar={() => onOpenTab?.('calendar')}
        onOpenSplitTable={() => onOpenTab?.('receipts')}
      />
    );
  }

  return (
    <Screen scroll>
      <Text variant="title" style={styles.greeting}>
        {strings.main.greeting(user?.displayName)}
      </Text>

      {reviewCount > 0 ? (
        <Pressable onPress={() => setShowReview(true)} testID="household-review-banner">
          <Banner tone="warning">{strings.solo.review.count(reviewCount)}</Banner>
        </Pressable>
      ) : null}

      <HouseholdPanel />

      <View style={styles.spacer} />
      <Button
        title={strings.auth.signOut}
        variant="ghost"
        onPress={signOut}
        testID="sign-out-button"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { marginBottom: theme.spacing.lg },
  spacer: { minHeight: theme.spacing.xl, flexGrow: 1 },
});
