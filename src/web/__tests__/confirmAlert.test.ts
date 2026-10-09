import { Platform } from 'react-native';
import { confirmAlert } from '../confirmAlert';

// Regression: react-native-web's Alert.alert is a documented no-op (it does
// nothing at all) — every confirm-before-action flow built on it
// (receipt share, receipt delete, event delete, regenerate invite code)
// was silently broken on the live web app. Found via spec 016 e2e coverage
// while testing receipt sharing: the button click produced no error, no
// console warning, nothing — because the dialog it was waiting on never
// existed.
describe('confirmAlert', () => {
  const originalOS = Platform.OS;
  // jest's test environment has no real browser `window.confirm` — RN's own
  // jest setup polyfills a bare `window` object, so assign the mock rather
  // than `jest.spyOn`, which requires the property to already exist.
  let confirmMock: jest.Mock;

  beforeEach(() => {
    confirmMock = jest.fn();
    (window as unknown as { confirm: jest.Mock }).confirm = confirmMock;
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { get: () => originalOS });
  });

  it('calls the non-cancel button when the web confirm() dialog is accepted', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web' });
    confirmMock.mockReturnValue(true);
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    confirmAlert('Compartir', 'Esto no se puede deshacer', [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Compartir', onPress: onConfirm },
    ]);

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('Compartir'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls the cancel button when the web confirm() dialog is dismissed', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web' });
    confirmMock.mockReturnValue(false);
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    confirmAlert('Eliminar', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does nothing extra when dismissed with no cancel button', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web' });
    confirmMock.mockReturnValue(false);
    const onConfirm = jest.fn();

    expect(() =>
      confirmAlert('Eliminar', undefined, [{ text: 'Eliminar', onPress: onConfirm }]),
    ).not.toThrow();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('passes straight through to native Alert.alert on non-web platforms', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios' });
    const onConfirm = jest.fn();

    confirmAlert('Eliminar', 'seguro?', [{ text: 'Eliminar', onPress: onConfirm }]);

    // Native Alert.alert just queues the dialog; it doesn't invoke onPress
    // synchronously (that happens when the user taps the real native
    // button), so the only thing to verify here is that the web shim was
    // not used — the mocked window.confirm must never be called.
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
