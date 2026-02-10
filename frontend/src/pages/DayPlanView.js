import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Backpack, ShieldCheck, Share2, Loader2, MapPin, Coins } from 'lucide-react';
import api from '../api';
import MapView from '../components/MapView';
import WeatherCard from '../components/WeatherCard';
import ActivityCard from '../components/ActivityCard';
import { getCurrencySymbol, cachePlan, getCachedPlan } from '../utils';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DayPlanView() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    // Try cache first
    const cached = getCachedPlan(planId);
    if (cached) {
      setPlan(cached);
      setFromCache(true);
      setLoading(false);
      // Still fetch fresh in background to sync
      api.get(`${API}/api/plans/${planId}`)
        .then(res => {
          setPlan(res.data);
          cachePlan(res.data);
        })
        .catch(() => { /* cached version is fine */ });
    } else {
      api.get(`${API}/api/plans/${planId}`)
        .then(res => {
          setPlan(res.data);
          cachePlan(res.data);
        })
        .catch(() => alert('Failed to load plan'))
        .finally(() => setLoading(false));
    }
  }, [planId]);

  const handleExportMap = () => {
    if (!plan?.plan?.activities?.length) return;
    const acts = plan.plan.activities.filter(a => a.latitude && a.longitude);
    if (acts.length === 0) return;
    const origin = `${plan.plan.activities[0].latitude},${plan.plan.activities[0].longitude}`;
    const dest = origin;
    const waypoints = acts.slice(1).map(a => `${a.latitude},${a.longitude}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=walking`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!plan || !plan.plan) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-stone-400">Plan not found</p>
        <Link to="/trips" className="text-accent font-semibold mt-2 inline-block">Back to My Trips</Link>
      </div>
    );
  }

  const dayPlan = plan.plan;
  const activities = dayPlan.activities || [];
  const hasParseError = dayPlan.parse_error;
  const currencyCode = plan.preferences?.currency || 'GBP';
  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto" data-testid="day-plan-view">
      <Link
        to={`/trips/${plan.trip_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition mb-4 min-h-[48px]"
        data-testid="back-to-trip-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trip
      </Link>

      {fromCache && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-blue-700 flex items-center gap-2" data-testid="cached-plan-badge">
          <span className="font-semibold">Loaded instantly from your saved plans</span>
          <span className="text-blue-400">— ready to go, even offline</span>
        </div>
      )}

      {hasParseError ? (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6 mb-6">
          <p className="font-bold text-warning mb-2">Plan Generation Note</p>
          <p className="text-sm text-stone-600">The response could not be fully structured. Here is the raw output:</p>
          <pre className="mt-3 text-sm bg-white rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{dayPlan.raw_response}</pre>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-accent uppercase tracking-wider">{plan.port_name}, {plan.port_country}</span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary mb-2" data-testid="plan-title">
              {dayPlan.plan_title}
            </h1>
            <p className="text-stone-500 leading-relaxed">{dayPlan.summary}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-success" />
              <div>
                <p className="text-xs text-stone-400">Return By</p>
                <p className="font-mono font-bold text-primary" data-testid="return-time">{dayPlan.return_by}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
              <Coins className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-stone-400">Est. Cost ({currencyCode})</p>
                <p className="font-mono font-bold text-primary" data-testid="total-cost">{dayPlan.total_estimated_cost}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-stone-400">Activities</p>
                <p className="font-mono font-bold text-primary">{activities.length} stops</p>
              </div>
            </div>
          </div>

          {/* Map + Weather row */}
          <div className="grid lg:grid-cols-3 gap-4 mb-8">
            <div className="lg:col-span-2 h-[350px]">
              <MapView
                activities={activities}
                portLatitude={activities[0]?.latitude}
                portLongitude={activities[0]?.longitude}
                className="h-full"
              />
            </div>
            <div className="flex flex-col gap-4">
              <WeatherCard weather={plan.weather} />
              <button
                onClick={handleExportMap}
                className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 font-semibold hover:bg-primary/90 transition min-h-[48px]"
                data-testid="export-map-btn"
              >
                <Share2 className="w-4 h-4" />
                Open in Google Maps
              </button>
            </div>
          </div>

          {/* Activities Timeline */}
          <h2 className="font-heading text-xl font-bold text-primary mb-4">Your Itinerary</h2>
          <div className="mb-8">
            {activities.map((activity, i) => (
              <ActivityCard key={i} activity={activity} isLast={i === activities.length - 1} currencySymbol={currencySymbol} />
            ))}
          </div>

          {/* Packing & Safety */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {dayPlan.packing_suggestions?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Backpack className="w-5 h-5 text-primary" />
                  <h3 className="font-heading text-lg font-bold text-primary">What to Bring</h3>
                </div>
                <ul className="space-y-1.5">
                  {dayPlan.packing_suggestions.map((item, i) => (
                    <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-accent mt-0.5">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dayPlan.safety_tips?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-success" />
                  <h3 className="font-heading text-lg font-bold text-primary">Safety Tips</h3>
                </div>
                <ul className="space-y-1.5">
                  {dayPlan.safety_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                      <span className="text-success mt-0.5">-</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
