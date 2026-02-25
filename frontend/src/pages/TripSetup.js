import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ship, Plus, Trash2, MapPin, Calendar, Clock, ArrowRight, Loader2, Search, Globe } from 'lucide-react';
import api from '../api';
import { createTrip, getTrip, updateTrip, addPort as addPortToStorage, updatePort as updatePortInStorage } from '../storage';
import DateTimePicker from '../components/DateTimePicker';

const API = process.env.REACT_APP_BACKEND_URL;
const DROPDOWN_CLOSE_DELAY_MS = 250;

const CRUISE_SHIPS = [
  'Adventure of the Seas', 'AIDAcosma', 'AIDAnova', 'Allure of the Seas',
  'Anthem of the Seas', 'Azamara Quest', 'Azamara Pursuit', 'Azamara Journey',
  'Bolette', 'Borealis', 'Brilliance of the Seas',
  'Carnival Breeze', 'Carnival Celebration', 'Carnival Dream', 'Carnival Horizon',
  'Carnival Jubilee', 'Carnival Magic', 'Carnival Panorama', 'Carnival Vista',
  'Celebrity Apex', 'Celebrity Ascent', 'Celebrity Beyond', 'Celebrity Constellation',
  'Celebrity Edge', 'Celebrity Equinox', 'Celebrity Infinity', 'Celebrity Millennium',
  'Celebrity Reflection', 'Celebrity Silhouette', 'Celebrity Solstice',
  'Costa Diadema', 'Costa Firenze', 'Costa Smeralda', 'Costa Toscana',
  'Crown Princess', 'Diamond Princess',
  'Discovery Princess', 'Disney Dream', 'Disney Fantasy', 'Disney Magic',
  'Disney Wish', 'Disney Wonder',
  'Enchanted Princess', 'Enchantment of the Seas', 'Explorer of the Seas',
  'Freedom of the Seas', 'Grandeur of the Seas', 'Harmony of the Seas',
  'Icon of the Seas', 'Independence of the Seas',
  'Jewel of the Seas', 'Koningsdam',
  'Liberty of the Seas', 'Majestic Princess', 'Mariner of the Seas',
  'Mardi Gras', 'MSC Bellissima', 'MSC Grandiosa', 'MSC Magnifica',
  'MSC Meraviglia', 'MSC Musica', 'MSC Seashore', 'MSC Seascape',
  'MSC Splendida', 'MSC Virtuosa', 'MSC World Europa',
  'Navigator of the Seas', 'Nieuw Amsterdam', 'Nieuw Statendam',
  'Norwegian Bliss', 'Norwegian Breakaway', 'Norwegian Encore', 'Norwegian Escape',
  'Norwegian Getaway', 'Norwegian Joy', 'Norwegian Prima', 'Norwegian Viva',
  'Oasis of the Seas', 'Ovation of the Seas',
  'P&O Iona', 'P&O Arvia', 'P&O Britannia', 'P&O Aurora', 'P&O Arcadia',
  'Queen Elizabeth', 'Queen Mary 2', 'Queen Victoria', 'Queen Anne',
  'Quantum of the Seas', 'Rotterdam', 'Ruby Princess',
  'Sapphire Princess', 'Seabourn Encore', 'Seabourn Odyssey', 'Seabourn Ovation',
  'Seabourn Quest', 'Seabourn Sojourn',
  'Serenade of the Seas', 'Seven Seas Explorer', 'Seven Seas Grandeur',
  'Seven Seas Mariner', 'Seven Seas Navigator', 'Seven Seas Splendor',
  'Seven Seas Voyager', 'Silver Dawn', 'Silver Moon', 'Silver Muse',
  'Silver Nova', 'Silver Origin', 'Sky Princess',
  'Spectrum of the Seas', 'Spirit of Discovery', 'Spirit of Adventure',
  'Symphony of the Seas', 'Viking Jupiter', 'Viking Mars', 'Viking Neptune',
  'Viking Orion', 'Viking Saturn', 'Viking Star', 'Viking Venus',
  'Vision of the Seas', 'Volendam', 'Westerdam',
  'Wonder of the Seas', 'Zaandam', 'Zuiderdam',
];

const CRUISE_LINES = [
  'AIDA Cruises', 'Azamara', 'Carnival Cruise Line', 'Celebrity Cruises',
  'Costa Cruises', 'Crystal Cruises', 'Cunard', 'Disney Cruise Line',
  'Fred. Olsen Cruise Lines', 'Holland America Line', 'Hurtigruten',
  'Marella Cruises', 'MSC Cruises', 'Norwegian Cruise Line',
  'Oceania Cruises', 'P&O Cruises', 'Ponant', 'Princess Cruises',
  'Regent Seven Seas Cruises', 'Royal Caribbean International',
  'Saga Cruises', 'Seabourn Cruise Line', 'Silversea Cruises',
  'TUI Cruises', 'Viking Ocean Cruises', 'Virgin Voyages',
  'Windstar Cruises',
];

/** Format a Date object to YYYY-MM-DDTHH:mm for use in datetime-local min attributes */
function formatDateTimeLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/** Earliest allowed arrival: current time minus 24 hours */
function getMinArrival() {
  return formatDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/** Earliest allowed departure: after arrival (or current time if no arrival set) */
function getMinDeparture(arrivalValue) {
  if (arrivalValue) return arrivalValue;
  return formatDateTimeLocal(new Date());
}

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
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [showShipSuggestions, setShowShipSuggestions] = useState(false);
  const [showCruiseLineSuggestions, setShowCruiseLineSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const filteredShips = useMemo(() =>
    CRUISE_SHIPS.filter(s =>
      s.toLowerCase().includes(shipName.toLowerCase())
    ).slice(0, 8),
  [shipName]);

  const filteredCruiseLines = useMemo(() =>
    CRUISE_LINES.filter(l =>
      l.toLowerCase().includes(cruiseLine.toLowerCase())
    ).slice(0, 8),
  [cruiseLine]);

  useEffect(() => {
    api.get(`${API}/api/ports/regions`).then(res => setRegions(res.data)).catch(() => {});
  }, []);

  const searchPorts = useCallback(async (query, region) => {
    setSearchLoading(true);
    try {
      const params = { q: query || '', limit: 15 };
      if (region) params.region = region;
      const res = await api.get(`${API}/api/ports/search`, { params });
      setSuggestions(res.data);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      const trip = getTrip(tripId);
      if (trip) {
        setShipName(trip.ship_name);
        setCruiseLine(trip.cruise_line || '');
        setPorts(trip.ports || []);
      } else {
        alert('Trip not found');
      }
      setLoading(false);
    }
  }, [tripId, isEdit]);

  const addPort = () => {
    setPorts([...ports, {
      port_id: `temp-${Date.now()}`,
      name: '', country: '', latitude: '', longitude: '',
      arrival: '', departure: '',
    }]);
  };

  const selectShip = (ship) => {
    setShipName(ship);
    setShowShipSuggestions(false);
  };

  const selectCruiseLine = (line) => {
    setCruiseLine(line);
    setShowCruiseLineSuggestions(false);
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
        updateTrip(tripId, { ship_name: shipName, cruise_line: cruiseLine });
      } else {
        const trip = createTrip({ ship_name: shipName, cruise_line: cruiseLine });
        savedTripId = trip.trip_id;
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
          updatePortInStorage(savedTripId, port.port_id, portData);
        } else {
          addPortToStorage(savedTripId, portData);
        }
      }

      navigate(`/trips/${savedTripId}`);
    } catch (err) {
      alert('Failed to save trip: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredSuggestions = suggestions;

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
            {/* Ship Name with autocomplete */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Ship Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  onFocus={() => setShowShipSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowShipSuggestions(false), DROPDOWN_CLOSE_DELAY_MS)}
                  placeholder="e.g. Symphony of the Seas"
                  className="w-full h-14 rounded-xl bg-stone-50 border border-stone-200 px-4 text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  data-testid="ship-name-input"
                  required
                  autoComplete="off"
                />
                {showShipSuggestions && filteredShips.length > 0 && (
                  <div
                    className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-stone-200 shadow-lg max-h-48 overflow-y-auto"
                    data-testid="ship-suggestions"
                  >
                    {filteredShips.map((ship, i) => (
                      <button
                        key={ship}
                        type="button"
                        onMouseDown={() => selectShip(ship)}
                        className="w-full text-left px-4 py-3 hover:bg-stone-50 text-sm flex items-center gap-2 transition border-b border-stone-50 last:border-0"
                        data-testid={`ship-suggestion-${i}`}
                      >
                        <Ship className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                        {ship}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cruise Line with autocomplete */}
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Cruise Line (optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={cruiseLine}
                  onChange={(e) => setCruiseLine(e.target.value)}
                  onFocus={() => setShowCruiseLineSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCruiseLineSuggestions(false), DROPDOWN_CLOSE_DELAY_MS)}
                  placeholder="e.g. Royal Caribbean"
                  className="w-full h-14 rounded-xl bg-stone-50 border border-stone-200 px-4 text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                  data-testid="cruise-line-input"
                  autoComplete="off"
                />
                {showCruiseLineSuggestions && filteredCruiseLines.length > 0 && (
                  <div
                    className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-stone-200 shadow-lg max-h-48 overflow-y-auto"
                    data-testid="cruise-line-suggestions"
                  >
                    {filteredCruiseLines.map((line, i) => (
                      <button
                        key={line}
                        type="button"
                        onMouseDown={() => selectCruiseLine(line)}
                        className="w-full text-left px-4 py-3 hover:bg-stone-50 text-sm flex items-center gap-2 transition border-b border-stone-50 last:border-0"
                        data-testid={`cruise-line-suggestion-${i}`}
                      >
                        <Globe className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                        {line}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              <p className="text-sm">Click &quot;Add Port&quot; to add your first port of call</p>
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
                  <div className="relative sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1">
                      <Search className="w-3.5 h-3.5" /> Search Port
                    </label>
                    <input
                      type="text"
                      value={port.name}
                      onChange={(e) => {
                        updatePort(index, 'name', e.target.value);
                        setShowPortSuggestions(index);
                        setPortSearch(e.target.value);
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                        debounceRef.current = setTimeout(() => {
                          searchPorts(e.target.value, selectedRegion);
                        }, 250);
                      }}
                      onFocus={() => {
                        setShowPortSuggestions(index);
                        setPortSearch(port.name);
                        searchPorts(port.name || '', selectedRegion);
                      }}
                      onBlur={() => setTimeout(() => setShowPortSuggestions(null), DROPDOWN_CLOSE_DELAY_MS)}
                      placeholder="Type to search 350+ cruise ports worldwide..."
                      className="w-full h-12 rounded-xl bg-white border border-stone-200 px-3 pr-10 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                      data-testid={`port-name-${index}`}
                    />
                    {searchLoading && showPortSuggestions === index && (
                      <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-stone-400" />
                    )}
                    {showPortSuggestions === index && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-stone-200 shadow-lg max-h-64 overflow-y-auto">
                        {/* Region filter */}
                        <div className="sticky top-0 bg-white border-b border-stone-100 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <select
                              value={selectedRegion}
                              onChange={(e) => {
                                setSelectedRegion(e.target.value);
                                searchPorts(portSearch, e.target.value);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 flex-1 outline-none"
                              data-testid={`region-filter-${index}`}
                            >
                              <option value="">All Regions</option>
                              {regions.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-stone-400 whitespace-nowrap">{filteredSuggestions.length} results</span>
                          </div>
                        </div>
                        {filteredSuggestions.length > 0 ? (
                          filteredSuggestions.map((s, si) => (
                            <button
                              key={si}
                              type="button"
                              onMouseDown={() => selectSuggested(index, s)}
                              className="w-full text-left px-4 py-3 hover:bg-sand-100 text-sm flex items-center gap-2 transition border-b border-stone-50 last:border-0"
                            >
                              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="font-medium">{s.name}</span>
                              <span className="text-stone-400 text-xs">{s.country}</span>
                              <span className="text-stone-300 text-[10px] ml-auto">{s.region}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-stone-400">
                            {portSearch ? 'No ports found — you can still type any name manually' : 'Type to search...'}
                          </div>
                        )}
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
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Arrival
                    </label>
                    <DateTimePicker
                      value={port.arrival}
                      minValue={getMinArrival()}
                      onChange={(v) => updatePort(index, 'arrival', v)}
                      data-testid={`port-arrival-${index}`}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Departure
                    </label>
                    <DateTimePicker
                      value={port.departure}
                      minValue={getMinDeparture(port.arrival)}
                      onChange={(v) => updatePort(index, 'departure', v)}
                      data-testid={`port-departure-${index}`}
                      className="w-full"
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
