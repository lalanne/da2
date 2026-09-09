import { fireEvent, render, screen } from '@testing-library/react-native';
import { Banner, Button, Card, Chip, CodeChip, ListRow, Text, TextField } from '..';
import { theme } from '../../theme';

describe('Text', () => {
  it('applies the variant type ramp and default colour', async () => {
    await render(<Text variant="title">Hola</Text>);
    const el = screen.getByText('Hola');
    expect(el).toHaveStyle({ fontSize: theme.type.title.fontSize, color: theme.colors.textPrimary });
  });

  it('captions default to the secondary colour', async () => {
    await render(<Text variant="caption">nota</Text>);
    expect(screen.getByText('nota')).toHaveStyle({ color: theme.colors.textSecondary });
  });
});

describe('Button', () => {
  it('calls onPress and forwards testID', async () => {
    const onPress = jest.fn();
    await render(<Button title="Crear" onPress={onPress} testID="b" />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows a loading indicator and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button title="Crear" onPress={onPress} loading testID="b" />);
    expect(screen.getByTestId('b-loading')).toBeTruthy();
    expect(screen.queryByText('Crear')).toBeNull();
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Crear" onPress={onPress} disabled testID="b" />);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('meets the minimum touch target', async () => {
    await render(<Button title="Crear" testID="b" />);
    const style = screen.getByTestId('b').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat().filter(Boolean)) : style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(theme.minTouch);
  });
});

describe('TextField', () => {
  it('renders the label and an error line with a derived testID', async () => {
    await render(
      <TextField
        label="Código"
        value=""
        onChangeText={() => {}}
        error="El código no es válido."
        testID="code"
      />,
    );
    expect(screen.getByText('Código')).toBeTruthy();
    expect(screen.getByTestId('code-error')).toHaveTextContent('El código no es válido.');
  });

  it('passes text changes through', async () => {
    const onChangeText = jest.fn();
    await render(<TextField value="" onChangeText={onChangeText} testID="code" />);
    fireEvent.changeText(screen.getByTestId('code'), 'ABCD2345');
    expect(onChangeText).toHaveBeenCalledWith('ABCD2345');
  });
});

describe('Banner', () => {
  it('renders its message with the tone colour', async () => {
    await render(<Banner tone="danger">algo salió mal</Banner>);
    expect(screen.getByText('algo salió mal')).toHaveStyle({ color: theme.colors.danger });
  });
});

describe('ListRow', () => {
  it('is pressable when given onPress and forwards testID', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Tú" onPress={onPress} testID="row" />);
    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a subtitle', async () => {
    await render(<ListRow title="Crear un hogar" subtitle="Serás la primera persona" />);
    expect(screen.getByText('Serás la primera persona')).toBeTruthy();
  });
});

describe('Chip', () => {
  it('fires onPress and forwards testID', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Médico" onPress={onPress} testID="chip" />);
    fireEvent.press(screen.getByTestId('chip'));
    expect(onPress).toHaveBeenCalled();
  });

  it('meets the minimum touch target when interactive', async () => {
    await render(<Chip label="Médico" onPress={() => {}} testID="chip" />);
    const style = screen.getByTestId('chip').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat().filter(Boolean)) : style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(theme.minTouch);
  });

  it('selected uses the accent tint and text colour', async () => {
    await render(<Chip label="Médico" selected onPress={() => {}} testID="chip" />);
    expect(screen.getByText('Médico')).toHaveStyle({ color: theme.colors.accent });
  });

  it('a static chip (no onPress) is not a button and stays tinted', async () => {
    await render(<Chip label="Deporte" testID="chip" />);
    expect(screen.getByTestId('chip').props.accessibilityRole).toBeUndefined();
    expect(screen.getByText('Deporte')).toHaveStyle({ color: theme.colors.accent });
  });
});

describe('CodeChip', () => {
  it('renders the code as selectable text', async () => {
    await render(<CodeChip code="2Q8D48W4" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el).toHaveTextContent('2Q8D48W4');
    expect(el.props.selectable).toBe(true);
  });
});

describe('Card', () => {
  it('renders children and forwards testID', async () => {
    await render(
      <Card testID="card">
        <Text>contenido</Text>
      </Card>,
    );
    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
  });
});
