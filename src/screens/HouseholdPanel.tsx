import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { strings } from '../i18n/strings';
import { theme } from '../theme';
import { Avatar, Banner, Button, Card, CodeChip, ListRow, Text } from '../components';

export function HouseholdPanel() {
  const { household, members, regenerateInviteCode, isSubmitting } = useHouseholdStore();
  const [sharing, setSharing] = useState(false);

  if (!household) return null;

  const s = strings.household.settings;
  const soleParent = household.parentIds.length === 1;
  const code = household.pendingInviteCode;

  const onShare = async () => {
    if (!code) return;
    setSharing(true);
    try {
      await Share.share({ message: s.shareMessage(code, household.name) });
    } catch {
      // user dismissed the share sheet — nothing to do
    } finally {
      setSharing(false);
    }
  };

  const onRegenerate = () => {
    Alert.alert(s.regenerate, s.regenerateConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: s.regenerate, onPress: () => void regenerateInviteCode() },
    ]);
  };

  return (
    <View style={styles.container}>
      {soleParent && code ? (
        <Card style={styles.section} testID="invite-code-box">
          <Text variant="label" color="textSecondary">
            {s.inviteCodeHeading}
          </Text>
          <CodeChip code={code} testID="invite-code-value" />
          <Text variant="caption" color="textSecondary">
            {s.inviteCodeHelp} {s.inviteCodeCopyHint}
          </Text>
          <View style={styles.buttons}>
            <Button
              title={s.share}
              onPress={onShare}
              loading={sharing}
              testID="share-invite-button"
            />
            <Button
              title={s.regenerate}
              variant="secondary"
              onPress={onRegenerate}
              disabled={isSubmitting}
              testID="regenerate-invite-button"
            />
          </View>
          <Banner tone="info">{s.waitingForCoParent}</Banner>
        </Card>
      ) : null}

      <View style={styles.section}>
        <Text variant="heading">{s.title}</Text>
        <Card flush>
          {members.map((m, i) => (
            <View key={m.uid}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                title={m.isYou ? s.you : m.displayName ?? '—'}
                muted={!m.isYou && !m.displayName}
                leading={<Avatar name={m.isYou ? s.you : m.displayName} />}
                testID={`household-member-${m.uid}`}
              />
            </View>
          ))}
          {soleParent ? (
            <>
              <View style={styles.divider} />
              <ListRow title={s.emptySlot} muted leading={<Avatar empty />} />
            </>
          ) : null}
        </Card>
      </View>

      {household.children.length > 0 ? (
        <View style={styles.section}>
          <Text variant="heading">{s.childrenHeading}</Text>
          <Card flush>
            {household.children.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <ListRow title={c.name} testID={`household-child-${c.id}`} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: theme.spacing.lg },
  section: { gap: theme.spacing.sm },
  buttons: { gap: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.hairline },
});
