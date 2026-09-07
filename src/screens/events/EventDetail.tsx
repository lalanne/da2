import { Alert, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Button, Card, Screen, Text } from '../../components';
import { strings } from '../../i18n/strings';
import type { KidEvent } from '../../models/Event';
import type { Household } from '../../models/Household';
import type { HouseholdMember } from '../../store/householdStore';
import { dayLabel } from '../calendar/labels';
import { childrenLabel, eventTimeLabel, eventTypeLabel } from './labels';

interface Props {
  event: KidEvent;
  household: Household;
  members: HouseholdMember[];
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function EventDetail({ event, household, members, onEdit, onDelete, onBack }: Props) {
  const d = strings.events.detail;
  const editor = members.find((m) => m.uid === event.updatedBy);

  const confirmDelete = () => {
    Alert.alert(d.delete, d.deleteConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: d.delete, style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {event.title}
      </Text>

      <Card style={styles.section}>
        <Row label={eventTypeLabel(event.type)} value={dayLabel(event.date)} />
        <Row label={strings.events.form.startLabel} value={eventTimeLabel(event)} />
        <Row label={strings.events.form.childrenLabel} value={childrenLabel(event.childIds, household)} />
        {event.location ? (
          <Row label={strings.events.form.locationLabel} value={event.location} />
        ) : null}
        {event.recurrence ? (
          <Text variant="caption" color="textSecondary">
            {strings.events.weeklyUntil(dayLabel(event.recurrence.until))}
          </Text>
        ) : null}
        {event.notes ? <Text variant="body">{event.notes}</Text> : null}
        {editor ? (
          <Text variant="caption" color="textFaint">
            {strings.events.editedBy(editor.isYou ? strings.household.settings.you : editor.displayName ?? '—')}
          </Text>
        ) : null}
      </Card>

      <View style={styles.spacer} />
      <Button title={d.edit} onPress={onEdit} testID="event-edit-button" />
      <Button title={d.delete} variant="danger" onPress={confirmDelete} testID="event-delete-button" />
      <Button title={strings.common.back} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  section: { gap: theme.spacing.md },
  row: { gap: theme.spacing.xs },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
