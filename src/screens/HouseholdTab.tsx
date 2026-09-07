import { StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Button, Screen, Text } from '../components';
import { HouseholdPanel } from './HouseholdPanel';

export function HouseholdTab() {
  const { user, signOut } = useAuthStore();

  return (
    <Screen scroll>
      <Text variant="title" style={styles.greeting}>
        {strings.main.greeting(user?.displayName)}
      </Text>

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
