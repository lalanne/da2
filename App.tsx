import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { useHouseholdStore } from './src/store/householdStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { MainScreen } from './src/screens/MainScreen';
import { HouseholdOnboardingScreen } from './src/screens/HouseholdOnboardingScreen';

// react-native-firebase auth can briefly re-emit `null` when the app returns
// from the background before it re-resolves the persisted session. Wait this
// long before treating a null user as a real sign-out, so the household store
// isn't torn down (which flashes a blank loading screen).
const SIGN_OUT_GRACE_MS = 1800;

export default function App() {
  const { user, isInitializing } = useAuthStore();
  const householdStatus = useHouseholdStore((state) => state.status);
  const signOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (signOutTimer.current) {
      clearTimeout(signOutTimer.current);
      signOutTimer.current = null;
    }
    if (user) {
      useHouseholdStore.getState().start(user);
    } else {
      signOutTimer.current = setTimeout(() => {
        useHouseholdStore.getState().stop();
      }, SIGN_OUT_GRACE_MS);
    }
    return () => {
      if (signOutTimer.current) clearTimeout(signOutTimer.current);
    };
  }, [user]);

  return (
    <View style={styles.container}>
      {renderContent()}
      <StatusBar style="auto" />
    </View>
  );

  function renderContent() {
    if (isInitializing) {
      return <Loading testID="app-init-spinner" />;
    }
    if (!user) {
      // Keep showing the app while auth settles a transient null.
      return householdStatus === 'active' ? (
        <MainScreen />
      ) : (
        <WelcomeScreen />
      );
    }
    if (householdStatus === 'active') {
      return <MainScreen />;
    }
    if (householdStatus === 'noHousehold') {
      return <HouseholdOnboardingScreen />;
    }
    // 'idle' | 'loading' | 'activating' — waiting for the first profile snapshot
    return <Loading testID="household-init-spinner" />;
  }
}

function Loading({ testID }: { testID: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator testID={testID} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
