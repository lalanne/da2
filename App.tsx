import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { MainScreen } from './src/screens/MainScreen';

export default function App() {
  const { user, isInitializing } = useAuthStore();

  return (
    <View style={styles.container}>
      {isInitializing ? (
        <ActivityIndicator testID="app-init-spinner" />
      ) : user ? (
        <MainScreen />
      ) : (
        <WelcomeScreen />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
