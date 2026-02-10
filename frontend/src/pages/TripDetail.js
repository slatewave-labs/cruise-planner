import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Ship, MapPin, Calendar, Clock, Compass, Edit, Trash2, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/trips/${tripId}`)
      .then(res => setTrip(res.data))
      .catch(() => alert('Failed to load trip'))
      .finally(() => setLoading(false));
  }, [tripId]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip and all associated plans?')) return;
    try {
      await axios.delete(`${API}/api/trips/${tripId}`);
      navigate('/trips');
    } catch {
      alert('Failed to delete trip');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-stone-400">Trip not found</p>
        <Link to="/trips" className="text-accent font-semibold mt-2 inline-block">Back to My Trips</Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto" data-testid="trip-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary" data-testid="trip-ship-name">{trip.ship_name}</h1>
              {trip.cruise_line && <p className="text-sm text-muted-foreground">{trip.cruise_line}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/trips/${tripId}/edit`}
            className="inline-flex items-center gap-2 bg-white border-2 border-stone-200 rounded-full px-5 py-2.5 text-sm font-semibold text-primary hover:bg-stone-50 transition min-h-[48px]"
            data-testid="edit-trip-btn"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 bg-white border-2 border-red-200 rounded-full px-5 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition min-h-[48px]"
            data-testid="delete-trip-btn"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Ports */}
      <h2 className="font-heading text-xl font-bold text-primary mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-accent" />
        Ports of Call ({trip.ports?.length || 0})
      </h2>

      {(!trip.ports || trip.ports.length === 0) ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center shadow-sm">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-400 mb-4">No ports added yet</p>
          <Link
            to={`/trips/${tripId}/edit`}
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-6 py-3 font-semibold transition hover:bg-accent/90 min-h-[48px]"
          >
            <Edit className="w-4 h-4" />
            Add Ports
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {trip.ports.map((port, index) => (
            <div
              key={port.port_id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`port-card-${index}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-primary">{port.name}</h3>
                    <span className="text-sm text-stone-400">{port.country}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(port.arrival)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(port.arrival)} - {formatTime(port.departure)}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/trips/${tripId}/ports/${port.port_id}/plan`}
                  className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-5 py-3 font-semibold hover:bg-accent/90 transition-all active:scale-95 min-h-[48px] shrink-0"
                  data-testid={`plan-port-btn-${index}`}
                >
                  <Compass className="w-4 h-4" />
                  Plan Day
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
