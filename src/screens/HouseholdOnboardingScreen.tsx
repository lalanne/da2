import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n/strings';
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.household.onboardingTitle}</Text>
      <Text style={styles.subtitle}>{strings.household.onboardingSubtitle}</Text>
      <Button
        title={strings.household.createCta}
        onPress={() => setStep('create')}
        testID="onboarding-create-button"
      />
      <Button
        title={strings.household.joinCta}
        onPress={() => setStep('join')}
        testID="onboarding-join-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', color: '#555' },
});
