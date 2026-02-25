/**
 * Unit tests for PrivacyPolicy page component
 * Tests rendering of privacy policy page elements
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PrivacyPolicy from '../pages/PrivacyPolicy';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PrivacyPolicy Page Component', () => {
  test('renders without crashing', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
  });

  test('displays main heading', () => {
    renderWithRouter(<PrivacyPolicy />);
    const headings = screen.getAllByText(/Privacy Policy/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  test('displays last updated date', () => {
    renderWithRouter(<PrivacyPolicy />);
    const dates = screen.getAllByText(/February 2026/);
    expect(dates.length).toBeGreaterThan(0);
  });

  test('renders multiple privacy sections', () => {
    renderWithRouter(<PrivacyPolicy />);
    expect(screen.getByTestId('privacy-section-0')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-section-1')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-section-2')).toBeInTheDocument();
  });

  test('covers key privacy topics', () => {
    renderWithRouter(<PrivacyPolicy />);
    const collectTexts = screen.getAllByText(/Information We Collect/i);
    expect(collectTexts.length).toBeGreaterThan(0);
    const cookieTexts = screen.getAllByText(/Cookies/i);
    expect(cookieTexts.length).toBeGreaterThan(0);
    const rightsTexts = screen.getAllByText(/Your Rights/i);
    expect(rightsTexts.length).toBeGreaterThan(0);
  });

  test('mentions GDPR rights', () => {
    renderWithRouter(<PrivacyPolicy />);
    const gdprTexts = screen.getAllByText(/GDPR/i);
    expect(gdprTexts.length).toBeGreaterThan(0);
  });

  test('mentions third-party services', () => {
    renderWithRouter(<PrivacyPolicy />);
    const groqTexts = screen.getAllByText(/Groq/i);
    expect(groqTexts.length).toBeGreaterThan(0);
  });

  test('includes contact information', () => {
    renderWithRouter(<PrivacyPolicy />);
    const emailTexts = screen.getAllByText(/support@shoreexplorer\.com/i);
    expect(emailTexts.length).toBeGreaterThan(0);
  });

  test('includes link to terms page', () => {
    renderWithRouter(<PrivacyPolicy />);
    const termsLinks = screen.getAllByRole('link', { name: /terms/i });
    expect(termsLinks.length).toBeGreaterThan(0);
  });
});
