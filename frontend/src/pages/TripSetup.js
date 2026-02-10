import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ship, Plus, Trash2, MapPin, Calendar, Clock, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const popularPorts = [
  { name: 'Barcelona', country: 'Spain', lat: 41.3784, lng: 2.1925 },
  { name: 'Cozumel', country: 'Mexico', lat: 20.4318, lng: -86.9194 },
  { name: 'Nassau', country: 'Bahamas', lat: 25.0480, lng: -77.3554 },
  { name: 'Santorini', country: 'Greece', lat: 36.3932, lng: 25.4615 },
  { name: 'Dubrovnik', country: 'Croatia', lat: 42.6507, lng: 18.0944 },
  { name: 'St. Thomas', country: 'US Virgin Islands', lat: 18.3358, lng: -64.9307 },
  { name: 'Civitavecchia (Rome)', country: 'Italy', lat: 42.0930, lng: 11.7966 },
  { name: 'Mykonos', country: 'Greece', lat: 37.4467, lng: 25.3289 },
  { name: 'Juneau', country: 'Alaska, USA', lat: 58.3005, lng: -134.4197 },
  { name: 'Crete (Heraklion)', country: 'Greece', lat: 35.3387, lng: 25.1442 },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698 },
  { name: 'Palma de Mallorca', country: 'Spain', lat: 39.5696, lng: 2.6502 },
];

export default function TripSetup() {
  const navigate = useNavigate();
  const { tripId } = useParams();
  const isEdit = Boolean(tripId);

  const [shipName, setShipName] = useState('');
  const [cruiseLine, setCruiseLine] = useState('');
  const [ports, setPorts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPortSuggestions, setShowPortSuggestions] = useState(null);
  const [portSearch, setPortSearch] = useState('');

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      axios.get(`${API}/api/trips/${tripId}`)
        .then(res => {
          setShipName(res.data.ship_name);
          setCruiseLine(res.data.cruise_line || '');
          setPorts(res.data.ports || []);
        })
        .catch(() => alert('Failed to load trip'))
        .finally(() => setLoading(false));
    }
  }, [tripId, isEdit]);

  const addPort = () => {
    setPorts([...ports, {
      port_id: `temp-${Date.now()}`,
      name: '', country: '', latitude: '', longitude: '',
      arrival: '', departure: '',
    }]);
  };

  const updatePort = (index, field, value) => {
    const updated = [...ports];
    updated[index] = { ...updated[index], [field]: value };
    setPorts(updated);
  };

  const removePort = (index) => {
    setPorts(ports.filter((_, i) => i !== index));
  };

  const selectSuggested = (index, port) => {
    const updated = [...ports];
    updated[index] = {
      ...updated[index],
      name: port.name,
      country: port.country,
      latitude: port.lat,
      longitude: port.lng,
    };
    setPorts(updated);
    setShowPortSuggestions(null);
    setPortSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shipName.trim()) return alert('Please enter a ship name');

    setSaving(true);
    try {
      let savedTripId = tripId;
      if (isEdit) {
        await axios.put(`${API}/api/trips/${tripId}`, { ship_name: shipName, cruise_line: cruiseLine });
      } else {
        const res = await axios.post(`${API}/api/trips`, { ship_name: shipName, cruise_line: cruiseLine });
        savedTripId = res.data.trip_id;
      }

      // Save ports
      for (const port of ports) {
        const portData = {
          name: port.name,
          country: port.country,
          latitude: parseFloat(port.latitude) || 0,
          longitude: parseFloat(port.longitude) || 0,
          arrival: port.arrival,
          departure: port.departure,
        };
        if (port.port_id && !port.port_id.startsWith('temp-')) {
          await axios.put(`${API}/api/trips/${savedTripId}/ports/${port.port_id}`, portData);
        } else {
          await axios.post(`${API}/api/trips/${savedTripId}/ports`, portData);
        }
      }

      navigate(`/trips/${savedTripId}`);
    } catch (err) {
      alert('Failed to save trip: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const filteredSuggestions = popularPorts.filter(p =>
    p.name.toLowerCase().includes(portSearch.toLowerCase()) ||
    p.country.toLowerCase().includes(portSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto" data-testid="trip-setup-page">
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-2">
        {isEdit ? 'Edit Trip' : 'Plan a New Trip'}
      </h1>
      <p className="text-muted-foreground mb-8">Enter your cruise details and ports of call.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Ship Details */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
              <Ship className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-primary">Ship Details</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Ship Name</label>
              <input
                type="text"
                value={shipName}
                onChange={(e) => setShipName(e.target.value)}
                placeholder="e.g. Symphony of the Seas"
                className="w-full h-14 rounded-xl bg-stone-50 border border-stone-200 px-4 text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                data-testid="ship-name-input"
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Cruise Line (optional)</label>
              <input
                type="text"
                value={cruiseLine}
                onChange={(e) => setCruiseLine(e.target.value)}
                placeholder="e.g. Royal Caribbean"
                className="w-full h-14 rounded-xl bg-stone-50 border border-stone-200 px-4 text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                data-testid="cruise-line-input"
              />
            </div>
          </div>
        </div>

        {/* Ports of Call */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-heading text-xl font-bold text-primary">Ports of Call</h2>
            </div>
            <button
              type="button"
              onClick={addPort}
              className="inline-flex items-center gap-2 bg-primary text-white rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95 min-h-[48px]"
              data-testid="add-port-btn"
            >
              <Plus className="w-4 h-4" />
              Add Port
            </button>
          </div>

          {ports.length === 0 && (
            <div className="text-center py-10 text-stone-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No ports added yet</p>
              <p className="text-sm">Click "Add Port" to add your first port of call</p>
            </div>
          )}

          <div className="space-y-4">
            {ports.map((port, index) => (
              <div key={port.port_id || index} className="border border-stone-200 rounded-xl p-4 bg-sand-50 relative" data-testid={`port-entry-${index}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-accent">Port #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePort(index)}
                    className="text-stone-400 hover:text-red-500 transition p-1 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    data-testid={`remove-port-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Port Name</label>
                    <input
                      type="text"
                      value={port.name}
                      onChange={(e) => {
                        updatePort(index, 'name', e.target.value);
                        setShowPortSuggestions(index);
                        setPortSearch(e.target.value);
                      }}
                      onFocus={() => { setShowPortSuggestions(index); setPortSearch(port.name); }}
                      onBlur={() => setTimeout(() => setShowPortSuggestions(null), 200)}
                      placeholder="e.g. Barcelona"
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-name-${index}`}
                    />
                    {showPortSuggestions === index && filteredSuggestions.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-stone-200 shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuggestions.slice(0, 6).map((s, si) => (
                          <button
                            key={si}
                            type="button"
                            onMouseDown={() => selectSuggested(index, s)}
                            className="w-full text-left px-4 py-3 hover:bg-sand-100 text-sm flex items-center gap-2 transition"
                          >
                            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="font-medium">{s.name}</span>
                            <span className="text-stone-400 text-xs">{s.country}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Country</label>
                    <input
                      type="text"
                      value={port.country}
                      onChange={(e) => updatePort(index, 'country', e.target.value)}
                      placeholder="e.g. Spain"
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-country-${index}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={port.latitude}
                      onChange={(e) => updatePort(index, 'latitude', e.target.value)}
                      placeholder="41.3784"
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-lat-${index}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={port.longitude}
                      onChange={(e) => updatePort(index, 'longitude', e.target.value)}
                      placeholder="2.1925"
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-lng-${index}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Arrival
                    </label>
                    <input
                      type="datetime-local"
                      value={port.arrival}
                      onChange={(e) => updatePort(index, 'arrival', e.target.value)}
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-arrival-${index}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Departure
                    </label>
                    <input
                      type="datetime-local"
                      value={port.departure}
                      onChange={(e) => updatePort(index, 'departure', e.target.value)}
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-departure-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-full border-2 border-stone-200 text-stone-600 font-semibold hover:bg-stone-50 transition min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-accent text-white rounded-full px-8 py-3 font-bold shadow-lg hover:shadow-xl hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-50 min-h-[48px]"
            data-testid="save-trip-btn"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            {isEdit ? 'Update Trip' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}
