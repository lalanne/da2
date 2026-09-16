import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * Spec 012 — on a wide web window, a "push" screen (day detail, a propose
 * form, balance detail, …) opens as a centered dialog over the still-visible
 * tab instead of replacing it. The child is the exact same screen component
 * mobile/native renders full-screen; only where it mounts differs. RN core
 * `Modal` — the same primitive spec 009's `TimeField` sheet already proved
 * works cross-platform.
 */
export function WebDialog({ visible, onRequestClose, children, testID }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={onRequestClose}
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        <View style={styles.card} testID={testID}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: theme.colors.pressedOverlay },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 640,
    // A fixed (not percentage) height so the `Screen`-wrapped content inside
    // — which is `flex: 1` all the way down — has something concrete to
    // fill; `maxHeight: '90%'` alone leaves a flex:1 child with no basis.
    height: 720,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});
