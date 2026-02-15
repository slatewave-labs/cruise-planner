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
    temperature_2m_max: 25,
    temperature_2m_min: 18,
    weathercode: 1,
    precipitation_sum: 0,
    windspeed_10m_max: 15,
  };

  test('renders weather data correctly', () => {
    render(<WeatherCard data={mockWeatherData} />);
    
    // Check temperatures are displayed
    expect(screen.getByText(/25°C/i)).toBeInTheDocument();
    expect(screen.getByText(/18°C/i)).toBeInTheDocument();
  });

  test('renders clear sky condition', () => {
    const clearWeather = { ...mockWeatherData, weathercode: 0 };
    render(<WeatherCard data={clearWeather} />);
    
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });

  test('renders rainy condition', () => {
    const rainyWeather = { ...mockWeatherData, weathercode: 61, precipitation_sum: 5 };
    render(<WeatherCard data={rainyWeather} />);
    
    expect(screen.getByText(/rain/i)).toBeInTheDocument();
  });

  test('renders without crashing when data is missing', () => {
    render(<WeatherCard data={{}} />);
    
    // Should still render without errors
    expect(screen.getByTestId('weather-card')).toBeInTheDocument();
  });

  test('displays wind speed', () => {
    render(<WeatherCard data={mockWeatherData} />);
    
    expect(screen.getByText(/15/i)).toBeInTheDocument();
    expect(screen.getByText(/km\/h/i)).toBeInTheDocument();
  });

  test('displays precipitation when present', () => {
    const wetWeather = { ...mockWeatherData, precipitation_sum: 10 };
    render(<WeatherCard data={wetWeather} />);
    
    expect(screen.getByText(/10/i)).toBeInTheDocument();
    expect(screen.getByText(/mm/i)).toBeInTheDocument();
  });
});
