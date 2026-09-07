import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { Banner, Button, Card, Screen, Text, TextField } from '../../components';
import { strings } from '../../i18n/strings';
import { todayInTimezone } from '../../custody';
import { buildEventInput, type EventFormState } from '../../events';
import { EVENT_TYPES, type KidEvent, type NewEventInput } from '../../models/Event';
import type { Household } from '../../models/Household';
import { eventTypeLabel } from './labels';

interface Props {
  household: Household;
  initial?: KidEvent;
  isSubmitting: boolean;
  onSubmit: (input: NewEventInput) => Promise<boolean>;
  onBack: () => void;
}

function initialState(household: Household, initial?: KidEvent): EventFormState {
  const today = todayInTimezone(household.timezone);
  if (!initial) {
    return {
      title: '',
      type: 'doctor',
      childIds: household.children.map((c) => c.id),
      date: today,
      allDay: false,
      startTime: '',
      endTime: '',
      location: '',
      notes: '',
      repeats: false,
      until: '',
    };
  }
  return {
    title: initial.title,
    type: initial.type,
    childIds: initial.childIds,
    date: initial.date,
    allDay: initial.allDay,
    startTime: initial.startTime ?? '',
    endTime: initial.endTime ?? '',
    location: initial.location ?? '',
    notes: initial.notes ?? '',
    repeats: initial.recurrence != null,
    until: initial.recurrence?.until ?? '',
  };
}

export function EventForm({ household, initial, isSubmitting, onSubmit, onBack }: Props) {
  const f = strings.events.form;
  const [state, setState] = useState<EventFormState>(() => initialState(household, initial));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<EventFormState>) => setState((s) => ({ ...s, ...patch }));

  const toggleChild = (id: string) =>
    set({
      childIds: state.childIds.includes(id)
        ? state.childIds.filter((x) => x !== id)
        : [...state.childIds, id],
    });

  const submit = async () => {
    const result = buildEventInput(state);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    await onSubmit(result.value);
  };

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {initial ? f.editTitle : f.newTitle}
      </Text>

      <View style={styles.form}>
        <TextField
          label={f.titleLabel}
          value={state.title}
          onChangeText={(title) => set({ title })}
          placeholder={f.titlePlaceholder}
          testID="event-title"
        />

        <View style={styles.block}>
          <Text variant="label">{f.typeLabel}</Text>
          <View style={styles.chips}>
            {EVENT_TYPES.map((t) => {
              const active = state.type === t;
              return (
                <Pressable
                  key={t}
                  testID={`event-type-${t}`}
                  onPress={() => set({ type: t, repeats: t === 'training' ? state.repeats : false })}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text variant="caption" color={active ? 'accent' : 'textPrimary'}>
                    {eventTypeLabel(t)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {household.children.length > 0 ? (
          <View style={styles.block}>
            <Text variant="label">{f.childrenLabel}</Text>
            <View style={styles.chips}>
              {household.children.map((c) => {
                const active = state.childIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    testID={`event-child-${c.id}`}
                    onPress={() => toggleChild(c.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text variant="caption" color={active ? 'accent' : 'textPrimary'}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <TextField
          label={f.dateLabel}
          value={state.date}
          onChangeText={(date) => set({ date })}
          placeholder={f.datePlaceholder}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          testID="event-date"
        />

        <Card>
          <Pressable
            style={styles.toggleRow}
            onPress={() => set({ allDay: !state.allDay })}
            testID="event-allday-toggle"
          >
            <Text variant="body">{f.allDayToggle}</Text>
            <Check on={state.allDay} />
          </Pressable>
          {!state.allDay ? (
            <View style={styles.times}>
              <TextField
                label={f.startLabel}
                value={state.startTime}
                onChangeText={(startTime) => set({ startTime })}
                placeholder={f.timePlaceholder}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                testID="event-start"
              />
              <TextField
                label={f.endLabel}
                value={state.endTime}
                onChangeText={(endTime) => set({ endTime })}
                placeholder={f.timePlaceholder}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                testID="event-end"
              />
            </View>
          ) : null}
        </Card>

        <TextField
          label={f.locationLabel}
          value={state.location}
          onChangeText={(location) => set({ location })}
          testID="event-location"
        />
        <TextField
          label={f.notesLabel}
          value={state.notes}
          onChangeText={(notes) => set({ notes })}
          testID="event-notes"
        />

        {state.type === 'training' ? (
          <Card>
            <Pressable
              style={styles.toggleRow}
              onPress={() => set({ repeats: !state.repeats })}
              testID="event-repeats-toggle"
            >
              <Text variant="body">{f.repeatsToggle}</Text>
              <Check on={state.repeats} />
            </Pressable>
            {state.repeats ? (
              <TextField
                label={f.untilLabel}
                value={state.until}
                onChangeText={(until) => set({ until })}
                placeholder={f.datePlaceholder}
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                testID="event-until"
              />
            ) : null}
          </Card>
        ) : null}

        {error ? (
          <Banner tone="danger" testID="event-error">
            {error}
          </Banner>
        ) : null}
      </View>

      <View style={styles.spacer} />
      <Button
        title={initial ? f.submitEdit : f.submitNew}
        onPress={submit}
        loading={isSubmitting}
        testID="event-submit"
      />
      <Button title={strings.common.cancel} variant="ghost" onPress={onBack} />
    </Screen>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <View style={[styles.check, on && styles.checkOn]}>
      {on ? (
        <Text variant="caption" color="accentText">
          ✓
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: theme.spacing.lg },
  form: { gap: theme.spacing.lg },
  block: { gap: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: theme.minTouch - 8,
    justifyContent: 'center',
  },
  chipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.minTouch,
  },
  times: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  check: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  spacer: { minHeight: theme.spacing.lg, flexGrow: 1 },
});
