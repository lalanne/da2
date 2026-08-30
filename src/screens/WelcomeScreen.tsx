import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export function WelcomeScreen() {
  const { signIn, isSigningIn, error } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Shared scheduling for co-parenting.</Text>
      {isSigningIn ? (
        <ActivityIndicator testID="sign-in-spinner" />
      ) : (
        <Button title="Continue with Google" onPress={signIn} testID="google-sign-in-button" />
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
