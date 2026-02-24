/**
 * Local storage service for trips and plans.
 * All trip/plan data lives on-device in localStorage.
 * The backend is only used for AI plan generation, weather, and port search.
 */

const TRIPS_KEY = 'shoreexplorer_trips';
const PLANS_KEY = 'shoreexplorer_plans';

// --- Helpers ---

/** Reject keys that could pollute Object.prototype. */
function isSafeKey(key) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowISO() {
  return new Date().toISOString();
}

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* localStorage full or unavailable */ }
}

// --- Trip CRUD ---

/** Create a new trip. Returns the full trip object. */
export function createTrip({ ship_name, cruise_line = '' }) {
  const now = nowISO();
  const trip = {
    trip_id: generateId(),
    ship_name,
    cruise_line,
    ports: [],
    created_at: now,
    updated_at: now,
  };
  const store = readStore(TRIPS_KEY);
  store[trip.trip_id] = trip;
  writeStore(TRIPS_KEY, store);
  return trip;
}

/** List all trips, sorted newest-first. */
export function listTrips() {
  const store = readStore(TRIPS_KEY);
  return Object.values(store)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/** Get a single trip by ID, or null if not found. */
export function getTrip(tripId) {
  if (!isSafeKey(tripId)) return null;
  const store = readStore(TRIPS_KEY);
  return store[tripId] || null;
}

/** Update trip fields (ship_name, cruise_line). Returns updated trip or null. */
export function updateTrip(tripId, updates) {
  if (!isSafeKey(tripId)) return null;
  const store = readStore(TRIPS_KEY);
  const trip = store[tripId];
  if (!trip) return null;
  if (updates.ship_name !== undefined) store[tripId].ship_name = updates.ship_name;
  if (updates.cruise_line !== undefined) store[tripId].cruise_line = updates.cruise_line;
  store[tripId].updated_at = nowISO();
  writeStore(TRIPS_KEY, store);
  return store[tripId];
}

/** Delete a trip and its associated plans. Returns true if trip existed. */
export function deleteTrip(tripId) {
  if (!isSafeKey(tripId)) return false;
  const store = readStore(TRIPS_KEY);
  if (!store[tripId]) return false;
  delete store[tripId];
  writeStore(TRIPS_KEY, store);
  // Cascade-delete plans for this trip
  deletePlansByTrip(tripId);
  return true;
}

// --- Port CRUD (within a trip) ---

/** Add a port to a trip. Returns the new port object, or null if trip not found. */
export function addPort(tripId, portData) {
  if (!isSafeKey(tripId)) return null;
  const store = readStore(TRIPS_KEY);
  const trip = store[tripId];
  if (!trip) return null;
  const port = {
    port_id: generateId(),
    name: portData.name,
    country: portData.country,
    latitude: portData.latitude,
    longitude: portData.longitude,
    arrival: portData.arrival,
    departure: portData.departure,
  };
  store[tripId].ports = store[tripId].ports || [];
  store[tripId].ports.push(port);
  store[tripId].updated_at = nowISO();
  writeStore(TRIPS_KEY, store);
  return port;
}

/** Update an existing port in a trip. Returns true if successful. */
export function updatePort(tripId, portId, portData) {
  if (!isSafeKey(tripId)) return false;
  const store = readStore(TRIPS_KEY);
  const trip = store[tripId];
  if (!trip) return false;
  const idx = (trip.ports || []).findIndex(p => p.port_id === portId);
  if (idx === -1) return false;
  store[tripId].ports[idx] = {
    port_id: portId,
    name: portData.name,
    country: portData.country,
    latitude: portData.latitude,
    longitude: portData.longitude,
    arrival: portData.arrival,
    departure: portData.departure,
  };
  store[tripId].updated_at = nowISO();
  writeStore(TRIPS_KEY, store);
  return true;
}

/** Remove a port from a trip. Returns true if successful. */
export function deletePort(tripId, portId) {
  if (!isSafeKey(tripId)) return false;
  const store = readStore(TRIPS_KEY);
  const trip = store[tripId];
  if (!trip) return false;
  const before = (trip.ports || []).length;
  store[tripId].ports = (trip.ports || []).filter(p => p.port_id !== portId);
  if (store[tripId].ports.length === before) return false;
  store[tripId].updated_at = nowISO();
  writeStore(TRIPS_KEY, store);
  // Cascade-delete plans for this port
  deletePlansByPort(portId);
  return true;
}

// --- Plan Storage ---

/** Save a plan to localStorage. */
export function savePlan(plan) {
  if (!plan.plan_id || !isSafeKey(plan.plan_id)) return;
  const store = readStore(PLANS_KEY);
  store[plan.plan_id] = plan;
  writeStore(PLANS_KEY, store);
}

/** Get a single plan by ID, or null if not found. */
export function getPlan(planId) {
  if (!isSafeKey(planId)) return null;
  const store = readStore(PLANS_KEY);
  return store[planId] || null;
}

/** Get all plans for a specific trip, sorted newest-first. */
export function getPlansForTrip(tripId) {
  const store = readStore(PLANS_KEY);
  return Object.values(store)
    .filter(p => p.trip_id === tripId)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
}

/** Get plans for a specific port in a trip, sorted newest-first. */
export function getPlansForPort(tripId, portId) {
  const store = readStore(PLANS_KEY);
  return Object.values(store)
    .filter(p => p.trip_id === tripId && p.port_id === portId)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
}

/** Count plans for a trip. */
export function getPlanCountForTrip(tripId) {
  return getPlansForTrip(tripId).length;
}

/** Delete all plans belonging to a trip. */
function deletePlansByTrip(tripId) {
  const store = readStore(PLANS_KEY);
  let changed = false;
  for (const [id, plan] of Object.entries(store)) {
    if (plan.trip_id === tripId) {
      delete store[id];
      changed = true;
    }
  }
  if (changed) writeStore(PLANS_KEY, store);
}

/** Delete all plans belonging to a port. */
function deletePlansByPort(portId) {
  const store = readStore(PLANS_KEY);
  let changed = false;
  for (const [id, plan] of Object.entries(store)) {
    if (plan.port_id === portId) {
      delete store[id];
      changed = true;
    }
  }
  if (changed) writeStore(PLANS_KEY, store);
}
