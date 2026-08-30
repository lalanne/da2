import { Button, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export function MainScreen() {
  const { user, signOut } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hi{user?.displayName ? `, ${user.displayName}` : ''}</Text>
      <Button title="Sign out" onPress={signOut} testID="sign-out-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '600' },
});
