import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateField, TimeField } from '..';
import { strings } from '../../i18n/strings';

const dProps = { label: 'Fecha', timezone: 'America/Santiago', testID: 'd' };

describe('DateField', () => {
  it('shows the value formatted for humans', async () => {
    await render(<DateField {...dProps} value="2026-09-12" onChange={jest.fn()} />);
    expect(screen.getByText('12 sep 2026')).toBeTruthy();
    expect(screen.queryByTestId('d-day-2026-09-20')).toBeNull(); // closed
  });

  it('optional + empty shows the placeholder', async () => {
    await render(<DateField {...dProps} value={null} optional onChange={jest.fn()} />);
    expect(screen.getByText(strings.dateTime.chooseDate)).toBeTruthy();
  });

  it('opens the grid on tap; a day emits its ISO date', async () => {
    const onChange = jest.fn();
    await render(<DateField {...dProps} value="2026-09-12" onChange={onChange} />);

    fireEvent.press(screen.getByTestId('d-field'));
    expect(await screen.findByText('septiembre 2026')).toBeTruthy();

    fireEvent.press(screen.getByTestId('d-day-2026-09-20'));
    expect(onChange).toHaveBeenCalledWith('2026-09-20');
  });

  it('month arrows move the view without changing the value', async () => {
    const onChange = jest.fn();
    await render(<DateField {...dProps} value="2026-09-12" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('d-field'));
    await screen.findByText('septiembre 2026');

    fireEvent.press(screen.getByTestId('d-next'));
    expect(await screen.findByText('octubre 2026')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects max — a later day does not fire onChange', async () => {
    const onChange = jest.fn();
    await render(<DateField {...dProps} value="2026-09-10" max="2026-09-10" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('d-field'));
    await screen.findByText('septiembre 2026');
    fireEvent.press(screen.getByTestId('d-day-2026-09-20'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('TimeField', () => {
  it('shows the value; a "Sin hora" placeholder when optional + null', async () => {
    const { rerender } = await render(<TimeField label="Hora" value="09:30" onChange={jest.fn()} testID="t" />);
    expect(screen.getByTestId('t-field')).toHaveTextContent('09:30');
    await rerender(<TimeField label="Hora" value={null} optional onChange={jest.fn()} testID="t" />);
    expect(screen.getByTestId('t-field')).toHaveTextContent(strings.dateTime.chooseTime);
  });

  it('opens a sheet and a row emits the picked time', async () => {
    const onChange = jest.fn();
    await render(<TimeField label="Hora" value="09:30" onChange={onChange} testID="t" />);
    fireEvent.press(screen.getByTestId('t-field'));
    fireEvent.press(await screen.findByTestId('t-opt-10:00'));
    expect(onChange).toHaveBeenCalledWith('10:00');
  });

  it('optional: the "Sin hora" row emits null', async () => {
    const onChange = jest.fn();
    await render(<TimeField label="Hora" value="09:30" optional onChange={onChange} testID="t" />);
    fireEvent.press(screen.getByTestId('t-field'));
    fireEvent.press(await screen.findByTestId('t-opt-none'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
