import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';

export function WelcomeScreen() {
  const { signIn, isSigningIn, error } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.auth.welcomeTitle}</Text>
      <Text style={styles.subtitle}>{strings.auth.welcomeSubtitle}</Text>
      {isSigningIn ? (
        <ActivityIndicator testID="sign-in-spinner" />
      ) : (
        <Button
          title={strings.auth.continueWithGoogle}
          onPress={signIn}
          testID="google-sign-in-button"
        />
      )}
      {error ? (
        <Text style={styles.error} testID="sign-in-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#555' },
  error: { color: '#c0392b', textAlign: 'center' },
});
