/**
 * Unit tests for the custom DateTimePicker component.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DateTimePicker from '../components/DateTimePicker';

const EXPECTED_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

describe('DateTimePicker — rendering', () => {
  test('renders a date input, hour select, and minute select', () => {
    render(<DateTimePicker value="" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-date')).toBeInTheDocument();
    expect(screen.getByTestId('dtp-hour')).toBeInTheDocument();
    expect(screen.getByTestId('dtp-minute')).toBeInTheDocument();
  });

  test('minute select contains exactly the 12 five-minute options', () => {
    render(<DateTimePicker value="" onChange={() => {}} data-testid="dtp" />);
    const minuteSelect = screen.getByTestId('dtp-minute');
    const options = Array.from(minuteSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(EXPECTED_MINUTES);
  });

  test('hour select contains exactly 24 options (00–23)', () => {
    render(<DateTimePicker value="" onChange={() => {}} data-testid="dtp" />);
    const hourSelect = screen.getByTestId('dtp-hour');
    const options = Array.from(hourSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toHaveLength(24);
    expect(options[0]).toBe('00');
    expect(options[23]).toBe('23');
  });
});

describe('DateTimePicker — controlled value', () => {
  test('parses and displays a valid datetime value', () => {
    render(<DateTimePicker value="2026-06-15T14:30" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-date')).toHaveValue('2026-06-15');
    expect(screen.getByTestId('dtp-hour')).toHaveValue('14');
    expect(screen.getByTestId('dtp-minute')).toHaveValue('30');
  });

  test('snaps a non-5-minute value to the nearest 5-minute mark', () => {
    // 37 min → nearest is 35
    render(<DateTimePicker value="2026-06-15T09:37" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-minute')).toHaveValue('35');
  });

  test('snaps a minute closer to the next 5-mark upward (e.g. 38 → 40)', () => {
    render(<DateTimePicker value="2026-06-15T09:38" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-minute')).toHaveValue('40');
  });

  test('renders empty state when value is empty string', () => {
    render(<DateTimePicker value="" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-date')).toHaveValue('');
  });
});

describe('DateTimePicker — onChange callbacks', () => {
  test('calls onChange with combined value when date changes', () => {
    const handleChange = jest.fn();
    render(<DateTimePicker value="2026-06-15T08:00" onChange={handleChange} data-testid="dtp" />);
    fireEvent.change(screen.getByTestId('dtp-date'), { target: { value: '2026-07-20' } });
    expect(handleChange).toHaveBeenCalledWith('2026-07-20T08:00');
  });

  test('calls onChange with combined value when hour changes', () => {
    const handleChange = jest.fn();
    render(<DateTimePicker value="2026-06-15T08:00" onChange={handleChange} data-testid="dtp" />);
    fireEvent.change(screen.getByTestId('dtp-hour'), { target: { value: '16' } });
    expect(handleChange).toHaveBeenCalledWith('2026-06-15T16:00');
  });

  test('calls onChange with combined value when minute changes', () => {
    const handleChange = jest.fn();
    render(<DateTimePicker value="2026-06-15T08:00" onChange={handleChange} data-testid="dtp" />);
    fireEvent.change(screen.getByTestId('dtp-minute'), { target: { value: '45' } });
    expect(handleChange).toHaveBeenCalledWith('2026-06-15T08:45');
  });

  test('calls onChange with empty string when date is cleared', () => {
    const handleChange = jest.fn();
    render(<DateTimePicker value="2026-06-15T08:00" onChange={handleChange} data-testid="dtp" />);
    fireEvent.change(screen.getByTestId('dtp-date'), { target: { value: '' } });
    expect(handleChange).toHaveBeenCalledWith('');
  });
});

describe('DateTimePicker — minValue prop', () => {
  test('sets the date input min attribute to the date portion of minValue', () => {
    render(
      <DateTimePicker
        value=""
        onChange={() => {}}
        minValue="2026-01-01T10:00"
        data-testid="dtp"
      />
    );
    expect(screen.getByTestId('dtp-date')).toHaveAttribute('min', '2026-01-01');
  });

  test('does not set min attribute on date input when minValue is absent', () => {
    render(<DateTimePicker value="" onChange={() => {}} data-testid="dtp" />);
    expect(screen.getByTestId('dtp-date')).not.toHaveAttribute('min');
  });
});
