import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import TripSetup from './pages/TripSetup';
import TripDetail from './pages/TripDetail';
import PortPlanner from './pages/PortPlanner';
import DayPlanView from './pages/DayPlanView';
import MyTrips from './pages/MyTrips';
import TermsConditions from './pages/TermsConditions';

function App() {
  return (
    <Router>
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
