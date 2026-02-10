import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ship, MapPin, Calendar, Plus, Loader2, Anchor } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/trips`)
      .then(res => setTrips(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto" data-testid="my-trips-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary">My Trips</h1>
          <p className="text-muted-foreground mt-1">Your cruise adventures</p>
        </div>
        <Link
          to="/trips/new"
          className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-5 py-3 font-semibold hover:bg-accent/90 transition-all active:scale-95 min-h-[48px]"
          data-testid="new-trip-btn"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
          <Anchor className="w-14 h-14 mx-auto mb-4 text-stone-300" />
          <h2 className="font-heading text-xl font-bold text-primary mb-2">No Trips Yet</h2>
          <p className="text-stone-400 mb-6 max-w-sm mx-auto">
            Create your first trip to start planning your cruise port adventures.
          </p>
          <Link
            to="/trips/new"
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-6 py-3 font-bold hover:bg-accent/90 transition min-h-[48px]"
            data-testid="create-first-trip-btn"
          >
            <Plus className="w-5 h-5" />
            Create Your First Trip
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {trips.map((trip, i) => (
            <motion.div
              key={trip.trip_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                to={`/trips/${trip.trip_id}`}
                className="block bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-all group"
                data-testid={`trip-card-${i}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-accent transition-colors">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-primary group-hover:text-accent transition-colors">
                      {trip.ship_name}
                    </h3>
                    {trip.cruise_line && (
                      <p className="text-sm text-muted-foreground">{trip.cruise_line}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {trip.ports?.length || 0} ports
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(trip.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
