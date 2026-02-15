// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import React from 'react';

// Mock window.matchMedia
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock leaflet for MapView component tests
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    remove: jest.fn(),
    on: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
  })),
  icon: jest.fn(),
  divIcon: jest.fn(),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  FeatureGroup: jest.fn(() => ({
    addTo: jest.fn(),
    getBounds: jest.fn(),
  })),
  featureGroup: jest.fn(() => ({
    addTo: jest.fn(),
    getBounds: jest.fn(),
  })),
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position }) => <div data-testid="marker" data-position={JSON.stringify(position)}>{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Polyline: ({ positions }) => <div data-testid="polyline" data-positions={JSON.stringify(positions)} />,
  useMap: () => ({
    setView: jest.fn(),
    fitBounds: jest.fn(),
  }),
}));
