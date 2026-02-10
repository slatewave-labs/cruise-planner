import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const shipIcon = new L.DivIcon({
  html: `<div style="background:#F43F5E;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">⚓</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const activityIcon = (order) => new L.DivIcon({
  html: `<div style="background:#0F172A;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${order}</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function MapView({ activities, portLatitude, portLongitude, className = '' }) {
  if (!portLatitude || !portLongitude) return null;

  const center = [portLatitude, portLongitude];
  const positions = [];

  if (activities && activities.length > 0) {
    positions.push(center);
    activities.forEach((a) => {
      if (a.latitude && a.longitude) {
        positions.push([a.latitude, a.longitude]);
      }
    });
    positions.push(center);
  }

  const bounds = positions.length > 1
    ? L.latLngBounds(positions)
    : L.latLngBounds([center, center]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-stone-200 shadow-sm ${className}`} data-testid="map-view">
      <MapContainer
        bounds={bounds.pad(0.15)}
        scrollWheelZoom={true}
        style={{ height: '100%', minHeight: '300px' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ship/Port marker */}
        <Marker position={center} icon={shipIcon}>
          <Popup>
            <strong>Cruise Ship Terminal</strong><br />Start & End Point
          </Popup>
        </Marker>

        {/* Activity markers */}
        {activities && activities.map((a, i) => (
          a.latitude && a.longitude ? (
            <Marker key={i} position={[a.latitude, a.longitude]} icon={activityIcon(a.order || i + 1)}>
              <Popup>
                <strong>{a.name}</strong><br />
                {a.start_time} - {a.end_time}<br />
                {a.cost_estimate}
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Route line */}
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: '#F43F5E', weight: 3, opacity: 0.7, dashArray: '8, 8' }}
          />
        )}
      </MapContainer>
    </div>
  );
}
