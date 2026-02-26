import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import TripSetup from './pages/TripSetup';
import TripDetail from './pages/TripDetail';
import PortPlanner from './pages/PortPlanner';
import DayPlanView from './pages/DayPlanView';
import MyTrips from './pages/MyTrips';
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { trackPageView } from './analytics';

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
      </Layout>
    </Router>
  );
}

export default App;
