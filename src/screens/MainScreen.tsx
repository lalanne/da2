import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';
import { HouseholdPanel } from './HouseholdPanel';

export function MainScreen() {
  const { user, signOut } = useAuthStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.main.greeting(user?.displayName)}</Text>
      <HouseholdPanel />
      <View style={styles.actions}>
        <Button title={strings.auth.signOut} onPress={signOut} testID="sign-out-button" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '600' },
  actions: { marginTop: 24 },
});
