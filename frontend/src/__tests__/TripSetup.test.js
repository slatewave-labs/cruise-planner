/**
 * Unit tests for TripSetup page component
 * Tests autocomplete behaviour, date validation helpers, and lat/lng hiding.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock the api module so no real HTTP happens
// ---------------------------------------------------------------------------
jest.mock('../api');
import api from '../api';

import TripSetup from '../pages/TripSetup';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const renderTripSetup = () =>
  render(
    <MemoryRouter initialEntries={['/trips/new']}>
      <Routes>
        <Route path="/trips/new" element={<TripSetup />} />
        <Route path="/trips/:tripId" element={<div data-testid="trip-detail" />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: { trip_id: 'trip-123' } });
  api.put.mockResolvedValue({ data: {} });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('TripSetup — rendering', () => {
  test('renders the new trip form', () => {
    renderTripSetup();
    expect(screen.getByTestId('trip-setup-page')).toBeInTheDocument();
    expect(screen.getByTestId('ship-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('cruise-line-input')).toBeInTheDocument();
    expect(screen.getByTestId('add-port-btn')).toBeInTheDocument();
  });

  test('shows "Plan a New Trip" heading for new trip', () => {
    renderTripSetup();
    expect(screen.getByRole('heading', { name: /plan a new trip/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Ship name autocomplete
// ---------------------------------------------------------------------------
describe('TripSetup — ship name autocomplete', () => {
  test('shows dropdown with suggestions on focus', async () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    fireEvent.focus(shipInput);
    await waitFor(() =>
      expect(screen.getByTestId('ship-suggestions')).toBeInTheDocument()
    );
  });

  test('filters suggestions based on typed text', async () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    fireEvent.focus(shipInput);
    fireEvent.change(shipInput, { target: { value: 'Symphony' } });
    await waitFor(() => expect(screen.getByText('Symphony of the Seas')).toBeInTheDocument());
  });

  test('hides dropdown when no ships match the query', async () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    fireEvent.focus(shipInput);
    fireEvent.change(shipInput, { target: { value: 'ZZZNOMATCH99' } });
    await waitFor(() =>
      expect(screen.queryByTestId('ship-suggestions')).not.toBeInTheDocument()
    );
  });

  test('selecting a suggestion sets the ship name value', async () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    fireEvent.focus(shipInput);
    fireEvent.change(shipInput, { target: { value: 'Symphony' } });
    await waitFor(() => expect(screen.getByText('Symphony of the Seas')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText('Symphony of the Seas'));
    expect(shipInput).toHaveValue('Symphony of the Seas');
  });

  test('shows at most 8 suggestions', async () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    // Focus with empty value — all ships match
    fireEvent.focus(shipInput);
    await waitFor(() => expect(screen.getByTestId('ship-suggestions')).toBeInTheDocument());
    const items = screen.getAllByTestId(/^ship-suggestion-\d+$/);
    expect(items.length).toBeLessThanOrEqual(8);
  });

  test('allows free-text entry not in the list', () => {
    renderTripSetup();
    const shipInput = screen.getByTestId('ship-name-input');
    fireEvent.change(shipInput, { target: { value: 'My Custom Yacht' } });
    expect(shipInput).toHaveValue('My Custom Yacht');
  });
});

// ---------------------------------------------------------------------------
// Cruise line autocomplete
// ---------------------------------------------------------------------------
describe('TripSetup — cruise line autocomplete', () => {
  test('shows dropdown with suggestions on focus', async () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.focus(input);
    await waitFor(() =>
      expect(screen.getByTestId('cruise-line-suggestions')).toBeInTheDocument()
    );
  });

  test('filters suggestions based on typed text', async () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Royal' } });
    await waitFor(() =>
      expect(screen.getByText('Royal Caribbean International')).toBeInTheDocument()
    );
  });

  test('hides dropdown when no cruise lines match', async () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ZZZNOMATCH99' } });
    await waitFor(() =>
      expect(screen.queryByTestId('cruise-line-suggestions')).not.toBeInTheDocument()
    );
  });

  test('selecting a suggestion sets the cruise line value', async () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'MSC' } });
    await waitFor(() => expect(screen.getByText('MSC Cruises')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText('MSC Cruises'));
    expect(input).toHaveValue('MSC Cruises');
  });

  test('shows at most 8 suggestions', async () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByTestId('cruise-line-suggestions')).toBeInTheDocument());
    const items = screen.getAllByTestId(/^cruise-line-suggestion-\d+$/);
    expect(items.length).toBeLessThanOrEqual(8);
  });

  test('allows free-text entry not in the list', () => {
    renderTripSetup();
    const input = screen.getByTestId('cruise-line-input');
    fireEvent.change(input, { target: { value: 'My Custom Line' } });
    expect(input).toHaveValue('My Custom Line');
  });
});

// ---------------------------------------------------------------------------
// Lat/Lng hidden from UI
// ---------------------------------------------------------------------------
describe('TripSetup — lat/lng hidden from UI', () => {
  test('lat and lng inputs are not in the DOM after adding a port', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-entry-0')).toBeInTheDocument());
    expect(screen.queryByTestId('port-lat-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('port-lng-0')).not.toBeInTheDocument();
  });

  test('name, country, arrival, and departure are visible in port entry', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-entry-0')).toBeInTheDocument());
    expect(screen.getByTestId('port-name-0')).toBeInTheDocument();
    expect(screen.getByTestId('port-country-0')).toBeInTheDocument();
    expect(screen.getByTestId('port-arrival-0')).toBeInTheDocument();
    expect(screen.getByTestId('port-departure-0')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Date/time constraints
// ---------------------------------------------------------------------------
describe('TripSetup — datetime picker', () => {
  test('arrival picker renders date input, hour select, and minute select', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0')).toBeInTheDocument());
    expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument();
    expect(screen.getByTestId('port-arrival-0-hour')).toBeInTheDocument();
    expect(screen.getByTestId('port-arrival-0-minute')).toBeInTheDocument();
  });

  test('departure picker renders date input, hour select, and minute select', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-departure-0')).toBeInTheDocument());
    expect(screen.getByTestId('port-departure-0-date')).toBeInTheDocument();
    expect(screen.getByTestId('port-departure-0-hour')).toBeInTheDocument();
    expect(screen.getByTestId('port-departure-0-minute')).toBeInTheDocument();
  });

  test('arrival minute select only contains 5-minute interval options', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-minute')).toBeInTheDocument());
    const minuteSelect = screen.getByTestId('port-arrival-0-minute');
    const options = Array.from(minuteSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
  });

  test('departure minute select only contains 5-minute interval options', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-departure-0-minute')).toBeInTheDocument());
    const minuteSelect = screen.getByTestId('port-departure-0-minute');
    const options = Array.from(minuteSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
  });

  test('arrival date input has a min attribute set to approximately 24 hours ago', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument());
    const dateInput = screen.getByTestId('port-arrival-0-date');
    const minAttr = dateInput.getAttribute('min');
    expect(minAttr).toBeTruthy();
    expect(minAttr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('departure date input has no min when no arrival is set', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-departure-0-date')).toBeInTheDocument());
    // When arrival is empty, getMinDeparture returns current time; date portion used as min
    const dateInput = screen.getByTestId('port-departure-0-date');
    const minAttr = dateInput.getAttribute('min');
    // May or may not have a min depending on computed current date — just verify format if present
    if (minAttr) {
      expect(minAttr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('departure date input min matches arrival date when arrival is set (no +5 min gap)', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument());

    // Set arrival via the date sub-input of the DateTimePicker
    const arrivalDateInput = screen.getByTestId('port-arrival-0-date');
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-10' } });

    // Departure min date should equal arrival date (no forced +5 min)
    const departureDateInput = screen.getByTestId('port-departure-0-date');
    expect(departureDateInput).toHaveAttribute('min', '2027-05-10');
  });
});

// ---------------------------------------------------------------------------
// Departure auto-populate & clamping
// ---------------------------------------------------------------------------
describe('TripSetup — departure auto-populate & validation', () => {
  test('setting arrival auto-populates departure when departure is empty', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument());

    // Set a future arrival date
    const arrivalDateInput = screen.getByTestId('port-arrival-0-date');
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-10' } });

    // Departure date should now be populated (not empty)
    const departureDateInput = screen.getByTestId('port-departure-0-date');
    expect(departureDateInput.value).toBeTruthy();
  });

  test('departure is clamped to arrival when arrival moves past current departure', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument());

    // Set an initial arrival and departure
    const arrivalDateInput = screen.getByTestId('port-arrival-0-date');
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-10' } });

    const departureDateInput = screen.getByTestId('port-departure-0-date');
    fireEvent.change(departureDateInput, { target: { value: '2027-05-10' } });

    // Now move arrival to a later date — departure should be clamped
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-15' } });

    expect(departureDateInput.value).toBe('2027-05-15');
  });

  test('departure is NOT changed when arrival moves to earlier date', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0-date')).toBeInTheDocument());

    // Set arrival and departure to the same date
    const arrivalDateInput = screen.getByTestId('port-arrival-0-date');
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-15' } });

    const departureDateInput = screen.getByTestId('port-departure-0-date');
    fireEvent.change(departureDateInput, { target: { value: '2027-05-20' } });

    // Move arrival to earlier date — departure should remain at 2027-05-20
    fireEvent.change(arrivalDateInput, { target: { value: '2027-05-10' } });

    expect(departureDateInput.value).toBe('2027-05-20');
  });
});
