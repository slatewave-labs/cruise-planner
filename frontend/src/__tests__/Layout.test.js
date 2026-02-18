/**
 * Unit tests for Layout component
 * Tests that Layout renders correctly WITHOUT page transition animations
 * This prevents regression of the jarring content refresh bug
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Layout from '../components/Layout';

// Wrapper for components that need Router
const renderWithRouter = (component, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {component}
    </MemoryRouter>
  );
};

describe('Layout Component', () => {
  describe('Basic Rendering', () => {
    test('renders without crashing', () => {
      renderWithRouter(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    });

    test('renders children directly without animation wrapper', () => {
      const testContent = 'Test Content for Layout';
      renderWithRouter(
        <Layout>
          <div data-testid="test-child">{testContent}</div>
        </Layout>
      );
      
      const childElement = screen.getByTestId('test-child');
      expect(childElement).toBeInTheDocument();
      expect(childElement).toHaveTextContent(testContent);
    });

    test('renders desktop navigation', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();
    });

    test('renders mobile header', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
    });

    test('renders mobile bottom navigation', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    test('renders all navigation items in desktop nav', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('nav-my-trips')).toBeInTheDocument();
      expect(screen.getByTestId('nav-new-trip')).toBeInTheDocument();
      expect(screen.getByTestId('nav-terms')).toBeInTheDocument();
    });

    test('renders all navigation items in mobile nav', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      expect(screen.getByTestId('mobile-nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-my-trips')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-new-trip')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-terms')).toBeInTheDocument();
    });

    test('highlights active route in navigation', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>,
        '/trips'
      );
      
      const myTripsLink = screen.getByTestId('nav-my-trips');
      expect(myTripsLink).toHaveClass('bg-white/15', 'text-white');
    });
  });

  describe('No Animation Wrappers (Regression Prevention)', () => {
    test('children are rendered directly in main element without animation wrapper', () => {
      const { container } = renderWithRouter(
        <Layout>
          <div data-testid="direct-child">Direct Content</div>
        </Layout>
      );
      
      // Find the main element
      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
      
      // Verify child is a direct descendant of main (no wrapper divs)
      const directChild = mainElement.querySelector('[data-testid="direct-child"]');
      expect(directChild).toBeInTheDocument();
      expect(directChild.parentElement).toBe(mainElement);
    });

    test('main element does not contain framer-motion animation wrapper', () => {
      const { container } = renderWithRouter(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
      
      const mainElement = container.querySelector('main');
      
      // Verify there's only one direct child (no animation wrapper)
      // framer-motion would add additional wrapper divs
      expect(mainElement.children.length).toBe(1); // Only the direct child
    });

    test('component structure matches expected DOM hierarchy', () => {
      const { container } = renderWithRouter(
        <Layout>
          <div data-testid="page-content">Page Content</div>
        </Layout>
      );
      
      // Expected structure:
      // div[data-testid="app-layout"]
      //   -> header (desktop nav)
      //   -> header (mobile header)
      //   -> main
      //      -> [direct children, no wrapper]
      //   -> nav (mobile bottom nav)
      
      const appLayout = container.querySelector('[data-testid="app-layout"]');
      const mainElement = appLayout.querySelector('main');
      const pageContent = mainElement.querySelector('[data-testid="page-content"]');
      
      expect(pageContent).toBeInTheDocument();
      expect(pageContent.parentElement).toBe(mainElement);
      
      // Ensure there's no intermediate wrapper
      expect(mainElement.children.length).toBe(1);
    });
  });

  describe('Content Rendering', () => {
    test('multiple children render correctly', () => {
      renderWithRouter(
        <Layout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Layout>
      );
      
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    test('complex nested children render correctly', () => {
      renderWithRouter(
        <Layout>
          <div>
            <section data-testid="section-1">
              <h1>Title</h1>
              <p>Paragraph</p>
            </section>
          </div>
        </Layout>
      );
      
      expect(screen.getByTestId('section-1')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
    });
  });

  describe('Route Changes', () => {
    test('children update when route changes without animation wrapper', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Layout>
            <div data-testid="home-page">Home Page</div>
          </Layout>
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      
      // Simulate route change by re-rendering with different content
      rerender(
        <MemoryRouter initialEntries={['/trips']}>
          <Layout>
            <div data-testid="trips-page">Trips Page</div>
          </Layout>
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('trips-page')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('main content area has semantic main element', () => {
      const { container } = renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
      expect(mainElement.tagName).toBe('MAIN');
    });

    test('navigation elements use semantic nav elements', () => {
      const { container } = renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      
      const navElements = container.querySelectorAll('nav');
      expect(navElements.length).toBeGreaterThan(0);
    });
  });
});
