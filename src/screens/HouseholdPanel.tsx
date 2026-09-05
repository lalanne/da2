import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHouseholdStore } from '../store/householdStore';
import { strings } from '../i18n/strings';

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
      <Text style={styles.heading}>{s.title}</Text>
      {members.map((m) => (
        <Text key={m.uid} style={styles.member} testID={`household-member-${m.uid}`}>
          {m.isYou ? s.you : m.displayName ?? '—'}
        </Text>
      ))}

      {soleParent && code ? (
        <View style={styles.inviteBox} testID="invite-code-box">
          <Text style={styles.heading}>{s.inviteCodeHeading}</Text>
          <Text style={styles.code} testID="invite-code-value">
            {code}
          </Text>
          <Text style={styles.help}>{s.inviteCodeHelp}</Text>
          <Text style={styles.waiting}>{s.waitingForCoParent}</Text>
          {sharing ? (
            <ActivityIndicator testID="share-spinner" />
          ) : (
            <Button title={s.share} onPress={onShare} testID="share-invite-button" />
          )}
          <Button
            title={s.regenerate}
            onPress={onRegenerate}
            testID="regenerate-invite-button"
            disabled={isSubmitting}
          />
        </View>
      ) : null}

      {household.children.length > 0 ? (
        <View style={styles.childrenBox}>
          <Text style={styles.heading}>{s.childrenHeading}</Text>
          {household.children.map((c) => (
            <Text key={c.id} style={styles.member} testID={`household-child-${c.id}`}>
              {c.name}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8, paddingVertical: 16 },
  heading: { fontSize: 16, fontWeight: '600' },
  member: { fontSize: 15 },
  inviteBox: { marginTop: 16, gap: 8 },
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 4 },
  help: { fontSize: 13, color: '#555' },
  waiting: { fontSize: 13, color: '#777', fontStyle: 'italic' },
  childrenBox: { marginTop: 16, gap: 4 },
});
