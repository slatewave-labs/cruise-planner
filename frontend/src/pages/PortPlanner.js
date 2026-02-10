import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Activity, Car, DollarSign, Sparkles, Loader2, ArrowLeft, MapPin, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const options = {
  party_type: [
    { value: 'solo', label: 'Solo Traveller', icon: '1' },
    { value: 'couple', label: 'Couple', icon: '2' },
    { value: 'family', label: 'Family', icon: '4+' },
  ],
  activity_level: [
    { value: 'light', label: 'Light', desc: '1-2 hour gentle walk' },
    { value: 'moderate', label: 'Moderate', desc: '2-4 hours exploring' },
    { value: 'active', label: 'Active', desc: '4-6 hour adventure' },
    { value: 'intensive', label: 'Intensive', desc: 'Full day, high energy' },
  ],
  transport_mode: [
    { value: 'walking', label: 'On Foot', desc: 'Walk everywhere' },
    { value: 'public_transport', label: 'Public Transport', desc: 'Buses, trams, metro' },
    { value: 'taxi', label: 'Taxi / Rideshare', desc: 'Maximum comfort' },
    { value: 'mixed', label: 'Mixed', desc: 'Combination of modes' },
  ],
  budget: [
    { value: 'free', label: 'Free Only', desc: 'No-cost activities' },
    { value: 'low', label: 'Low Cost', desc: 'Under $30/person' },
    { value: 'medium', label: 'Medium', desc: '$30-$100/person' },
    { value: 'high', label: 'High End', desc: '$100+/person' },
  ],
};

function OptionSelector({ title, icon: Icon, name, items, selected, onSelect }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-accent" />
        <h3 className="font-heading text-lg font-bold text-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(name, item.value)}
            className={`rounded-xl p-3 text-left border-2 transition-all min-h-[48px] ${
              selected === item.value
                ? 'border-accent bg-accent/5 shadow-sm'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
            data-testid={`option-${name}-${item.value}`}
          >
            <p className={`font-semibold text-sm ${selected === item.value ? 'text-accent' : 'text-primary'}`}>
              {item.label}
            </p>
            {item.desc && <p className="text-xs text-stone-400 mt-0.5">{item.desc}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PortPlanner() {
  const { tripId, portId } = useParams();
  const navigate = useNavigate();
  const [port, setPort] = useState(null);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState({
    party_type: 'couple',
    activity_level: 'moderate',
    transport_mode: 'mixed',
    budget: 'low',
  });

  useEffect(() => {
    axios.get(`${API}/api/trips/${tripId}`)
      .then(res => {
        setTrip(res.data);
        const p = res.data.ports?.find(p => p.port_id === portId);
        setPort(p);
      })
      .catch(() => alert('Failed to load trip'))
      .finally(() => setLoading(false));
  }, [tripId, portId]);

  const updatePref = (name, value) => {
    setPrefs(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/plans/generate`, {
        trip_id: tripId,
        port_id: portId,
        preferences: prefs,
      });
      navigate(`/plans/${res.data.plan_id}`);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setError(detail);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!port) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-stone-400">Port not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto" data-testid="port-planner-page">
      <button
        onClick={() => navigate(`/trips/${tripId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition mb-4 min-h-[48px]"
        data-testid="back-to-trip-btn"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trip
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary" data-testid="port-planner-title">
            Plan Your Day in {port.name}
          </h1>
          <p className="text-sm text-muted-foreground">{port.country}</p>
        </div>
      </div>

      {port.arrival && port.departure && (
        <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 mb-8 inline-flex items-center gap-3 text-sm text-stone-600">
          <span className="font-mono font-bold">{new Date(port.arrival).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-stone-300">→</span>
          <span className="font-mono font-bold">{new Date(port.departure).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-stone-400">|</span>
          <span>{new Date(port.arrival).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
        <h2 className="font-heading text-xl font-bold text-primary mb-6">Your Preferences</h2>

        <OptionSelector
          title="Who's Travelling?"
          icon={Users}
          name="party_type"
          items={options.party_type}
          selected={prefs.party_type}
          onSelect={updatePref}
        />
        <OptionSelector
          title="Activity Level"
          icon={Activity}
          name="activity_level"
          items={options.activity_level}
          selected={prefs.activity_level}
          onSelect={updatePref}
        />
        <OptionSelector
          title="Getting Around"
          icon={Car}
          name="transport_mode"
          items={options.transport_mode}
          selected={prefs.transport_mode}
          onSelect={updatePref}
        />
        <OptionSelector
          title="Budget"
          icon={DollarSign}
          name="budget"
          items={options.budget}
          selected={prefs.budget}
          onSelect={updatePref}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full inline-flex items-center justify-center gap-3 bg-accent text-white rounded-full py-4 text-lg font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-[0.98] disabled:opacity-50 min-h-[56px]"
        data-testid="generate-plan-btn"
      >
        {generating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating Your Day Plan...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate Day Plan
          </>
        )}
      </button>

      {generating && (
        <p className="text-center text-sm text-stone-400 mt-3">
          This may take 15-30 seconds as AI crafts your personalised itinerary...
        </p>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3" data-testid="plan-error-message">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 mb-1">Plan Generation Failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
