import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Banner, Button, Emblem, Screen, Text } from '../components';
import { EmailAuthScreen } from './EmailAuthScreen';

export function WelcomeScreen() {
  const { signIn, isSigningIn, error } = useAuthStore();
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  if (showEmailAuth) {
    return <EmailAuthScreen onBack={() => setShowEmailAuth(false)} />;
  }

  return (
    <Screen center>
      <View style={styles.hero}>
        <Emblem />
        <View style={styles.copy}>
          <Text variant="display" align="center">
            {strings.auth.welcomeTitle}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {strings.auth.welcomeSubtitle}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={strings.auth.continueWithGoogle}
          onPress={signIn}
          loading={isSigningIn}
          testID="google-sign-in-button"
        />
        <Button
          title={strings.auth.continueWithEmail}
          variant="secondary"
          onPress={() => setShowEmailAuth(true)}
          testID="continue-with-email-button"
        />
        {error ? (
          <Banner tone="danger" testID="sign-in-error">
            {error}
          </Banner>
        ) : (
          <Text variant="caption" color="textFaint" align="center">
            {strings.auth.googleHint}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: theme.spacing.lg },
  copy: { gap: theme.spacing.md, alignItems: 'center' },
  actions: { alignSelf: 'stretch', gap: theme.spacing.md, marginTop: theme.spacing.xxl },
});
