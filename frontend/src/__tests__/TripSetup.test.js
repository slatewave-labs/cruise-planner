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
describe('TripSetup — datetime constraints', () => {
  test('arrival input has step=300', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0')).toBeInTheDocument());
    expect(screen.getByTestId('port-arrival-0')).toHaveAttribute('step', '300');
  });

  test('departure input has step=300', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-departure-0')).toBeInTheDocument());
    expect(screen.getByTestId('port-departure-0')).toHaveAttribute('step', '300');
  });

  test('arrival input min is approximately 24 hours ago', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0')).toBeInTheDocument());
    const arrivalInput = screen.getByTestId('port-arrival-0');
    const minAttr = arrivalInput.getAttribute('min');
    expect(minAttr).toBeTruthy();
    expect(minAttr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    // The min should be close to 24 hours ago
    const minDate = new Date(minAttr);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(minDate.getTime() - twentyFourHoursAgo.getTime());
    expect(diffMs).toBeLessThan(2 * 60 * 1000); // within 2 minutes tolerance
  });

  test('departure input min is at least current time when no arrival set', async () => {
    const before = Date.now();
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-departure-0')).toBeInTheDocument());
    const departureInput = screen.getByTestId('port-departure-0');
    const minAttr = departureInput.getAttribute('min');
    expect(minAttr).toBeTruthy();
    const minDate = new Date(minAttr);
    const after = Date.now();
    // minDate should be between before and after (with 2 min tolerance)
    expect(minDate.getTime()).toBeGreaterThanOrEqual(before - 2 * 60 * 1000);
    expect(minDate.getTime()).toBeLessThanOrEqual(after + 2 * 60 * 1000);
  });

  test('departure min updates when arrival is set', async () => {
    renderTripSetup();
    fireEvent.click(screen.getByTestId('add-port-btn'));
    await waitFor(() => expect(screen.getByTestId('port-arrival-0')).toBeInTheDocument());

    const arrivalInput = screen.getByTestId('port-arrival-0');
    const departureInput = screen.getByTestId('port-departure-0');

    // Set a future arrival
    const futureArrival = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const yyyy = futureArrival.getFullYear();
    const mm = String(futureArrival.getMonth() + 1).padStart(2, '0');
    const dd = String(futureArrival.getDate()).padStart(2, '0');
    const hh = String(futureArrival.getHours()).padStart(2, '0');
    const min = String(futureArrival.getMinutes()).padStart(2, '0');
    const arrivalStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    fireEvent.change(arrivalInput, { target: { value: arrivalStr } });

    // Departure min should be arrival + 5 minutes (or current time if greater)
    const expectedMin = new Date(futureArrival.getTime() + 300000);
    const depMinAttr = departureInput.getAttribute('min');
    const depMinDate = new Date(depMinAttr);
    // Should be approx arrival + 5 minutes
    const diffMs = Math.abs(depMinDate.getTime() - expectedMin.getTime());
    expect(diffMs).toBeLessThan(2 * 60 * 1000);
  });
});
