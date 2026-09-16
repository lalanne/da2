import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { WebDialog } from '../WebDialog';

describe('WebDialog', () => {
  it('mounts children only when visible', async () => {
    const { rerender } = await render(
      <WebDialog visible={false} onRequestClose={jest.fn()}>
        <RNText>dialog content</RNText>
      </WebDialog>,
    );
    expect(screen.queryByText('dialog content')).toBeNull();

    await rerender(
      <WebDialog visible onRequestClose={jest.fn()}>
        <RNText>dialog content</RNText>
      </WebDialog>,
    );
    expect(screen.getByText('dialog content')).toBeTruthy();
  });

  it('calls onRequestClose when the backdrop is pressed', async () => {
    const onRequestClose = jest.fn();
    await render(
      <WebDialog visible onRequestClose={onRequestClose} testID="dlg">
        <RNText>dialog content</RNText>
      </WebDialog>,
    );

    fireEvent.press(screen.getByTestId('dlg-backdrop'));
    expect(onRequestClose).toHaveBeenCalled();
  });
});
