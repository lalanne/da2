import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { TabBar } from '../components';
import { useAuthStore } from '../store/authStore';
import { useCustodyStore } from '../store/custodyStore';
import { useCustodySync } from '../hooks/useCustodySync';
import { useEventsSync } from '../hooks/useEventsSync';
import { useReceiptsSync } from '../hooks/useReceiptsSync';
import { useSplitSync } from '../hooks/useSplitSync';
import { pendingForResponder } from '../custody';
import { CalendarTab } from './calendar/CalendarTab';
import { EventsTab } from './events/EventsTab';
import { ReceiptsScreen } from './receipts/ReceiptsScreen';
import { HouseholdTab } from './HouseholdTab';

type Tab = 'calendar' | 'events' | 'receipts' | 'household';

export function MainScreen() {
  useCustodySync();
  useEventsSync();
  useReceiptsSync();
  useSplitSync();
  const uid = useAuthStore((s) => s.user?.uid);
  const proposals = useCustodyStore((s) => s.proposals);
  const [tab, setTab] = useState<Tab>('calendar');

  const toRespond = uid ? pendingForResponder(proposals, uid).length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {tab === 'calendar' ? (
          <CalendarTab />
        ) : tab === 'events' ? (
          <EventsTab />
        ) : tab === 'receipts' ? (
          <ReceiptsScreen />
        ) : (
          <HouseholdTab />
        )}
      </View>
      <TabBar
        active={tab}
        onChange={(key) => setTab(key as Tab)}
        items={[
          {
            key: 'calendar',
            label: strings.nav.calendar,
            badge: toRespond || undefined,
          },
          { key: 'events', label: strings.nav.events },
          { key: 'receipts', label: strings.nav.receipts },
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
