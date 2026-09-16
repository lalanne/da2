import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Banner, Button, Emblem, Screen, Text } from '../components';

/**
 * Spec 014 — shown instead of household/main routing whenever the signed-in
 * user's email isn't verified yet (in practice, only ever an email/password
 * sign-up; Google accounts arrive already verified).
 */
export function VerifyEmailScreen() {
  const { user, isSigningIn, error, resendVerificationEmail, refreshEmailVerified, signOut } =
    useAuthStore();
  const s = strings.auth.verify;
  const [resent, setResent] = useState(false);
  const [notYetVerified, setNotYetVerified] = useState(false);

  async function onResend() {
    setResent(false);
    const ok = await resendVerificationEmail();
    if (ok) setResent(true);
  }

  async function onConfirm() {
    setNotYetVerified(false);
    const ok = await refreshEmailVerified();
    if (ok && useAuthStore.getState().user?.emailVerified === false) {
      setNotYetVerified(true);
    }
  }

  return (
    <Screen center testID="verify-email-screen">
      <View style={styles.hero}>
        <Emblem />
        <Text variant="display" align="center">
          {s.title}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {s.body(user?.email ?? '')}
        </Text>
      </View>

      <View style={styles.actions}>
        {notYetVerified ? (
          <Banner tone="warning" testID="not-yet-verified-banner">
            {s.notYetVerified}
          </Banner>
        ) : null}
        {resent ? (
          <Banner tone="success" testID="resend-sent-banner">
            {s.resendSent}
          </Banner>
        ) : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}

        <Button
          title={s.confirm}
          onPress={onConfirm}
          loading={isSigningIn}
          testID="verify-confirm-button"
        />
        <Button
          title={s.resend}
          variant="secondary"
          onPress={onResend}
          loading={isSigningIn}
          testID="verify-resend-button"
        />
        <Button
          title={strings.auth.signOut}
          variant="ghost"
          onPress={signOut}
          testID="verify-sign-out-button"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: theme.spacing.md },
  actions: { alignSelf: 'stretch', gap: theme.spacing.md, marginTop: theme.spacing.xxl },
});
