import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Card, ListRow, Screen, Text } from '../components';
import { CreateHouseholdScreen } from './CreateHouseholdScreen';
import { JoinHouseholdScreen } from './JoinHouseholdScreen';

type Step = 'choose' | 'create' | 'join';

/**
 * Shown after sign-in while the user's profile has no householdId (spec 002,
 * criterion 5 routing). Self-contained step state — no navigator yet.
 */
export function HouseholdOnboardingScreen() {
  const [step, setStep] = useState<Step>('choose');

  if (step === 'create') return <CreateHouseholdScreen onBack={() => setStep('choose')} />;
  if (step === 'join') return <JoinHouseholdScreen onBack={() => setStep('choose')} />;

  const s = strings.household;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">{s.onboardingTitle}</Text>
        <Text variant="body" color="textSecondary">
          {s.onboardingSubtitle}
        </Text>
      </View>

      <View style={styles.options}>
        <Card flush>
          <ListRow
            title={s.createCta}
            subtitle={s.createHint}
            onPress={() => setStep('create')}
            testID="onboarding-create-button"
          />
        </Card>
        <Card flush>
          <ListRow
            title={s.joinCta}
            subtitle={s.joinHint}
            onPress={() => setStep('join')}
            testID="onboarding-join-button"
          />
        </Card>
      </View>

      <View style={styles.spacer} />
      <Text variant="caption" color="textFaint" align="center">
        {s.oneHouseholdNote}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  options: { gap: theme.spacing.md },
  spacer: { flex: 1 },
});
