import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { TabBar } from '../TabBar';

const items = [
  { key: 'calendar', label: 'Calendario' },
  { key: 'events', label: 'Eventos' },
];

// Regression: on a device with an on-screen Android nav bar (3-button mode),
// the OS reserves real space at the bottom of the screen. The bar rendered
// flush against it, so the OS buttons sat on top of "Recibos"/"Hogar" and
// Javiera couldn't tap them during pilot testing — reported from a photo of
// her phone showing the nav bar overlapping the tab labels.
describe('TabBar', () => {
  it('pads for the bottom safe-area inset so system nav buttons cannot cover it', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 48 }}>
        <TabBar items={items} active="calendar" onChange={jest.fn()} testID="tab-bar" />
      </SafeAreaInsetsContext.Provider>,
    );

    const style = StyleSheet.flatten(screen.getByTestId('tab-bar').props.style);
    expect(style.paddingBottom).toBeGreaterThanOrEqual(48);
  });
});
