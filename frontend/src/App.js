import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import { trackPageView } from './analytics';

// Lazy-load non-landing pages to reduce the initial JS bundle
const TripSetup = lazy(() => import('./pages/TripSetup'));
const TripDetail = lazy(() => import('./pages/TripDetail'));
const PortPlanner = lazy(() => import('./pages/PortPlanner'));
const DayPlanView = lazy(() => import('./pages/DayPlanView'));
const MyTrips = lazy(() => import('./pages/MyTrips'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <PageViewTracker />
      <Layout>
        <Suspense fallback={<div className="flex-1" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/trips" element={<MyTrips />} />
            <Route path="/trips/new" element={<TripSetup />} />
            <Route path="/trips/:tripId" element={<TripDetail />} />
            <Route path="/trips/:tripId/edit" element={<TripSetup />} />
            <Route path="/trips/:tripId/ports/:portId/plan" element={<PortPlanner />} />
            <Route path="/plans/:planId" element={<DayPlanView />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
