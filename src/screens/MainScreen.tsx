import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { TabBar } from '../components';
import { useAuthStore } from '../store/authStore';
import { useCustodyStore } from '../store/custodyStore';
import { useCustodySync } from '../hooks/useCustodySync';
import { pendingForResponder } from '../custody';
import { CalendarTab } from './calendar/CalendarTab';
import { HouseholdTab } from './HouseholdTab';

export function MainScreen() {
  useCustodySync();
  const uid = useAuthStore((s) => s.user?.uid);
  const proposals = useCustodyStore((s) => s.proposals);
  const [tab, setTab] = useState<'calendar' | 'household'>('calendar');

  const toRespond = uid ? pendingForResponder(proposals, uid).length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {tab === 'calendar' ? <CalendarTab /> : <HouseholdTab />}
      </View>
      <TabBar
        active={tab}
        onChange={(key) => setTab(key as 'calendar' | 'household')}
        items={[
          {
            key: 'calendar',
            label: strings.nav.calendar,
            badge: toRespond || undefined,
          },
          { key: 'household', label: strings.nav.household },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1 },
});
