/**
 * Unit tests for Home page component
 * Tests that Home renders correctly with all expected elements
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Home from '../pages/Home';

// Wrapper for components that need Router
const renderWithRouter = (component) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('Home Page', () => {
  test('renders without crashing', () => {
    renderWithRouter(<Home />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  test('renders main heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Welcome to My App')).toBeInTheDocument();
  });

  test('renders Get Started button', () => {
    renderWithRouter(<Home />);
    const getStartedBtn = screen.getByTestId('get-started-btn');
    expect(getStartedBtn).toBeInTheDocument();
    expect(getStartedBtn).toHaveTextContent('Get Started');
  });

  test('Get Started button links to /items', () => {
    renderWithRouter(<Home />);
    const getStartedBtn = screen.getByTestId('get-started-btn');
    expect(getStartedBtn).toHaveAttribute('href', '/items');
  });

  test('renders Learn More button', () => {
    renderWithRouter(<Home />);
    const learnMoreBtn = screen.getByTestId('learn-more-btn');
    expect(learnMoreBtn).toBeInTheDocument();
    expect(learnMoreBtn).toHaveTextContent('Learn More');
  });

  test('Learn More button links to /about', () => {
    renderWithRouter(<Home />);
    const learnMoreBtn = screen.getByTestId('learn-more-btn');
    expect(learnMoreBtn).toHaveAttribute('href', '/about');
  });

  test('renders all feature cards', () => {
    renderWithRouter(<Home />);
    expect(screen.getByTestId('feature-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-3')).toBeInTheDocument();
  });

  test('feature cards show expected titles', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Fast API Backend')).toBeInTheDocument();
    expect(screen.getByText('React Frontend')).toBeInTheDocument();
    expect(screen.getByText('AI Integration')).toBeInTheDocument();
    expect(screen.getByText('Cloud Ready')).toBeInTheDocument();
  });

  test('renders CTA section with button', () => {
    renderWithRouter(<Home />);
    const ctaBtn = screen.getByTestId('cta-start-btn');
    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveTextContent('Get Started');
  });

  test('CTA button links to /items', () => {
    renderWithRouter(<Home />);
    const ctaBtn = screen.getByTestId('cta-start-btn');
    expect(ctaBtn).toHaveAttribute('href', '/items');
  });

  test('renders introductory text', () => {
    renderWithRouter(<Home />);
    expect(
      screen.getByText(
        /A full-stack application template with React, FastAPI, and AWS infrastructure/i
      )
    ).toBeInTheDocument();
  });

  test('renders "What\'s Included" section heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText(/What.*s Included/)).toBeInTheDocument();
  });

  test('renders "Ready to Build?" section heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Ready to Build?')).toBeInTheDocument();
  });
});
