import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { useHouseholdStore } from './src/store/householdStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { MainScreen } from './src/screens/MainScreen';
import { HouseholdOnboardingScreen } from './src/screens/HouseholdOnboardingScreen';

export default function App() {
  const { user, isInitializing } = useAuthStore();
  const householdStatus = useHouseholdStore((state) => state.status);

  useEffect(() => {
    if (user) {
      useHouseholdStore.getState().start(user);
    } else {
      useHouseholdStore.getState().stop();
    }
  }, [user]);

  return (
    <View style={styles.container}>
      {renderContent()}
      <StatusBar style="auto" />
    </View>
  );

  function renderContent() {
    if (isInitializing) {
      return <ActivityIndicator testID="app-init-spinner" />;
    }
    if (!user) {
      return <WelcomeScreen />;
    }
    if (householdStatus === 'active') {
      return <MainScreen />;
    }
    if (householdStatus === 'noHousehold') {
      return <HouseholdOnboardingScreen />;
    }
    // 'idle' | 'loading' — waiting for the first profile snapshot
    return <ActivityIndicator testID="household-init-spinner" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
