import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { buildResetInput, buildSignInInput, buildSignUpInput } from '../auth/forms';
import { Banner, Button, Screen, Text, TextField } from '../components';

type Mode = 'signUp' | 'signIn' | 'reset';

interface Props {
  onBack: () => void;
}

/** Spec 014 — email/password sign-up, sign-in, and the "forgot password" flow. */
export function EmailAuthScreen({ onBack }: Props) {
  const { signUpWithEmail, signInWithEmail, sendPasswordReset, isSigningIn, error } =
    useAuthStore();
  const s = strings.auth.email;

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const displayError = formError ?? error;

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    setResetSent(false);
  }

  async function submit() {
    setFormError(null);

    if (mode === 'reset') {
      const result = buildResetInput(email);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      const ok = await sendPasswordReset(result.value);
      if (ok) setResetSent(true);
      return;
    }

    if (mode === 'signUp') {
      const result = buildSignUpInput({ name, email, password });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      await signUpWithEmail(result.value.name, result.value.email, result.value.password);
      return;
    }

    const result = buildSignInInput({ email, password });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    await signInWithEmail(result.value.email, result.value.password);
  }

  if (mode === 'reset') {
    return (
      <Screen scroll testID="email-auth-screen">
        <Text variant="title" style={styles.title}>
          {s.reset.title}
        </Text>
        {resetSent ? (
          <>
            <Banner tone="success" testID="reset-sent-banner">
              {s.reset.sent}
            </Banner>
            <Button
              title={s.back}
              variant="ghost"
              onPress={() => switchMode('signIn')}
              testID="reset-back-button"
            />
          </>
        ) : (
          <View style={styles.form}>
            <Text variant="body" color="textSecondary">
              {s.reset.body}
            </Text>
            <TextField
              label={s.emailLabel}
              placeholder={s.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              testID="reset-email-field"
            />
            {displayError ? <Banner tone="danger">{displayError}</Banner> : null}
            <Button
              title={s.reset.submit}
              onPress={submit}
              loading={isSigningIn}
              testID="reset-submit-button"
            />
            <Button
              title={s.back}
              variant="ghost"
              onPress={() => switchMode('signIn')}
              testID="reset-cancel-button"
            />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll testID="email-auth-screen">
      <View style={styles.tabs}>
        <Button
          title={s.signInTab}
          variant={mode === 'signIn' ? 'primary' : 'secondary'}
          onPress={() => switchMode('signIn')}
          style={styles.tabButton}
          testID="email-mode-signin"
        />
        <Button
          title={s.signUpTab}
          variant={mode === 'signUp' ? 'primary' : 'secondary'}
          onPress={() => switchMode('signUp')}
          style={styles.tabButton}
          testID="email-mode-signup"
        />
      </View>

      <View style={styles.form}>
        {mode === 'signUp' ? (
          <TextField
            label={s.nameLabel}
            placeholder={s.namePlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="signup-name-field"
          />
        ) : null}
        <TextField
          label={s.emailLabel}
          placeholder={s.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-field"
        />
        <TextField
          label={s.passwordLabel}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry
          testID="password-field"
        />
        {mode === 'signUp' ? (
          <Text variant="caption" color="textFaint">
            {s.passwordHint}
          </Text>
        ) : null}

        {displayError ? <Banner tone="danger">{displayError}</Banner> : null}

        <Button
          title={mode === 'signUp' ? s.signUpSubmit : s.signInSubmit}
          onPress={submit}
          loading={isSigningIn}
          testID="email-submit-button"
        />

        {mode === 'signIn' ? (
          <Button
            title={s.forgotPassword}
            variant="ghost"
            onPress={() => switchMode('reset')}
            testID="forgot-password-button"
          />
        ) : null}
      </View>

      <Button title={s.back} variant="ghost" onPress={onBack} testID="email-auth-back-button" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  tabs: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  tabButton: { flex: 1 },
  form: { gap: theme.spacing.md },
});
