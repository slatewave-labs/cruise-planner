/**
 * Unit tests for Landing page component
 * Tests rendering of landing page elements
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Landing from '../pages/Landing';

// Wrapper for components that need Router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Landing Page Component', () => {
  test('renders without crashing', () => {
    renderWithRouter(<Landing />);
    
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  test('displays main heading', () => {
    renderWithRouter(<Landing />);
    
    // Check for "ShoreExplorer" text
    expect(screen.getByText(/ShoreExplorer/i)).toBeInTheDocument();
  });

  test('displays call-to-action button', () => {
    renderWithRouter(<Landing />);
    
    // Look for "Start Planning" or "Plan My Day" CTA
    const ctaButtons = screen.getAllByRole('link', { name: /plan.*day|start|begin|create/i });
    expect(ctaButtons.length).toBeGreaterThan(0);
    expect(ctaButtons[0]).toBeInTheDocument();
  });

  test('displays feature sections', () => {
    renderWithRouter(<Landing />);
    
    // Check for key features - use getAllByText since "weather" appears multiple times
    const weatherTexts = screen.getAllByText(/weather/i);
    expect(weatherTexts.length).toBeGreaterThan(0);
  });

  test('renders hero section with background', () => {
    renderWithRouter(<Landing />);
    
    const heroSection = screen.getByTestId('landing-page').querySelector('section');
    expect(heroSection).toBeInTheDocument();
  });

  test('displays multiple feature cards', () => {
    renderWithRouter(<Landing />);
    
    // Should have at least 3 feature cards
    const features = screen.getAllByText(/Your Cruise|Weather|Route|Plan/i);
    expect(features.length).toBeGreaterThanOrEqual(3);
  });
});
