import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';

describe('Home', () => {
  it('renders the hero heading', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: /static site template/i })).toBeInTheDocument();
  });

  it('renders the feature cards', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument();
    expect(screen.getByText('Secure by Default')).toBeInTheDocument();
    expect(screen.getByText('Global CDN')).toBeInTheDocument();
  });

  it('renders the Get Started link', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/about');
  });

  it('renders the CI/CD pipeline section', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('CI/CD Pipeline')).toBeInTheDocument();
  });
});
