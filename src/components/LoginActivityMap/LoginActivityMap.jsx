import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import 'leaflet/dist/leaflet.css';

const LOGIN_COLOR = '#16a34a';
const LOGOUT_COLOR = '#dc2626';
const OTHER_COLOR = '#f59e0b';

const colorFor = (kind) => (kind === 'login' ? LOGIN_COLOR : kind === 'logout' ? LOGOUT_COLOR : OTHER_COLOR);

// Groups events at (roughly) the same spot — repeat logins from the same
// office would otherwise stack dozens of fully-overlapping circles. Rounding
// to 3 decimal places is ~100m, plenty coarse for "same building".
const groupKey = (e) => `${e.lat.toFixed(3)},${e.lng.toFixed(3)}`;

export default function LoginActivityMap({ events }) {
  const points = useMemo(() => {
    // lat/lng are Postgres `numeric` columns — node-postgres returns those as
    // STRINGS (to avoid float precision loss), not numbers, so every value
    // needs an explicit Number() before any numeric method (.toFixed, map
    // centering) can touch it. Malformed values fall out here too (isNaN).
    const withCoords = (events || [])
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({ ...e, lat: Number(e.lat), lng: Number(e.lng) }))
      .filter((e) => !Number.isNaN(e.lat) && !Number.isNaN(e.lng));
    const groups = new Map();
    for (const e of withCoords) {
      const key = groupKey(e);
      if (!groups.has(key)) groups.set(key, { lat: e.lat, lng: e.lng, events: [] });
      groups.get(key).events.push(e);
    }
    return { withCoords, groups: Array.from(groups.values()) };
  }, [events]);

  const total = events?.length || 0;
  const located = points.withCoords.length;

  if (located === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: '#888', fontSize: 13 }}>
        No location data for these events yet.
      </Box>
    );
  }

  const center = [points.withCoords[0].lat, points.withCoords[0].lng];

  return (
    <Box sx={{ position: 'relative' }}>
      <MapContainer center={center} zoom={5} style={{ height: 320, width: '100%', borderRadius: 8 }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.groups.map((g, i) => {
          const latest = g.events[0];
          return (
            <CircleMarker
              key={i}
              center={[g.lat, g.lng]}
              radius={g.events.length > 1 ? 10 : 7}
              pathOptions={{ color: '#fff', weight: 2, fillColor: colorFor(latest.kind), fillOpacity: 0.9 }}
            >
              <Popup>
                <div style={{ fontSize: 12, maxHeight: 160, overflow: 'auto' }}>
                  {g.events.slice(0, 10).map((e, j) => (
                    <div key={j} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: j < g.events.length - 1 ? '1px solid #eee' : 'none' }}>
                      <div style={{ fontWeight: 700, color: colorFor(e.kind), textTransform: 'capitalize' }}>{e.kind}</div>
                      <div>{new Date(e.created_at).toLocaleString()}</div>
                      <div style={{ color: '#666' }}>{e.geo_city || e.geo_country ? `${e.geo_city || ''}${e.geo_city && e.geo_country ? ', ' : ''}${e.geo_country || ''}` : 'Unknown location'}</div>
                      {e.geo_isp && <div style={{ color: '#666' }}>{e.geo_isp}</div>}
                      <div style={{ color: '#999' }}>{e.ip || '—'}{e.location_source === 'gps' ? ' · GPS fix' : ''}</div>
                    </div>
                  ))}
                  {g.events.length > 10 && <div style={{ color: '#999' }}>+{g.events.length - 10} more here</div>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {located < total && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#9ca3af' }}>
          {located} of {total} events have location data.
        </Typography>
      )}
    </Box>
  );
}
