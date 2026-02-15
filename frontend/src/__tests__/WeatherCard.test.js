/**
 * Unit tests for WeatherCard component
 * Tests rendering of weather data with various conditions
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeatherCard from '../components/WeatherCard';

describe('WeatherCard Component', () => {
  const mockWeatherData = {
    temperature_2m_max: [25],
    temperature_2m_min: [18],
    weathercode: [1],
    precipitation_sum: [0],
    windspeed_10m_max: [15],
  };

  test('renders weather data correctly', () => {
    render(<WeatherCard weather={mockWeatherData} />);
    
    // Check temperatures are displayed
    expect(screen.getByText(/18° - 25°C/i)).toBeInTheDocument();
  });

  test('renders clear sky condition', () => {
    const clearWeather = { ...mockWeatherData, weathercode: [0] };
    render(<WeatherCard weather={clearWeather} />);
    
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  test('renders rainy condition', () => {
    const rainyWeather = { ...mockWeatherData, weathercode: [61], precipitation_sum: [5] };
    render(<WeatherCard weather={rainyWeather} />);
    
    expect(screen.getAllByText(/rain/i).length).toBeGreaterThan(0);
  });

  test('renders nothing when weather is null', () => {
    const { container } = render(<WeatherCard weather={null} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('displays wind speed', () => {
    render(<WeatherCard weather={mockWeatherData} />);
    
    expect(screen.getByText(/15km\/h/i)).toBeInTheDocument();
  });

  test('displays precipitation when present', () => {
    const wetWeather = { ...mockWeatherData, precipitation_sum: [10] };
    render(<WeatherCard weather={wetWeather} />);
    
    expect(screen.getByText(/10mm/i)).toBeInTheDocument();
  });

  test('handles missing weather code gracefully', () => {
    const noCodeWeather = {
      temperature_2m_max: [20],
      temperature_2m_min: [15],
      precipitation_sum: [0],
      windspeed_10m_max: [10],
    };
    render(<WeatherCard weather={noCodeWeather} />);
    
    // Should render with unknown/default weather
    expect(screen.getByTestId('weather-card')).toBeInTheDocument();
  });
});
