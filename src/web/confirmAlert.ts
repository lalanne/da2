import { Alert, Platform } from 'react-native';

interface ConfirmButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Drop-in for RN's `Alert.alert(title, message, buttons)` — react-native-web
 * ships `Alert.alert` as a documented no-op (it does nothing at all), so
 * every confirm-before-action flow built directly on it was silently
 * broken on web: share a receipt, delete a receipt, delete an event,
 * regenerate the invite code. Found via spec 016 e2e coverage while
 * testing receipt sharing — the button produced no error and no effect.
 * On native this is passed straight through unchanged; on web it uses the
 * browser's `window.confirm`, calling whichever button's `onPress` matches
 * the user's choice (OK → the first non-cancel button; Cancel → the
 * `cancel`-style button, if any).
 */
export function confirmAlert(
  title: string,
  message: string | undefined,
  buttons: ConfirmButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const confirmButton = buttons.find((b) => b.style !== 'cancel');
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const text = [title, message].filter(Boolean).join('\n\n');
  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
