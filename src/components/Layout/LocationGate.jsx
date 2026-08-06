// Hard-blocks the panel until the browser grants precise location — mirrors
// ClockInGate's gate-stacking role but for geolocation instead of the timer.
// Piloted per-tenant (tenant.location_enforced), same pattern as
// clock_in_enforced, so it stays silent for tenants that haven't opted in.
//
// Browser limit worth being upfront about: once a user permanently denies
// geolocation, JavaScript cannot re-trigger the native permission prompt —
// re-clicking "Try Again" will just get rejected again until they clear it
// from their browser's site settings. The copy below says so plainly.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { auth, authApi } from '../../lib/endpoints';

export default function LocationGate({ enabled, onResolvedChange }) {
  const user = auth.getUser();
  const tenant = auth.getTenant();
  const isSuperAdmin = user?.role === 'super_admin';
  const active = enabled && !isSuperAdmin && !!tenant?.location_enforced;

  const [status, setStatus] = useState('checking'); // checking | granted | denied | unsupported
  const [busy, setBusy] = useState(false);

  const requestLocation = useCallback(() => {
    setStatus('checking');
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        authApi.updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
        setBusy(false);
        setStatus('granted');
      },
      () => { setBusy(false); setStatus('denied'); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    requestLocation();
  }, [active, requestLocation]);

  const resolved = !active || status === 'granted';
  useEffect(() => { onResolvedChange?.(resolved); }, [resolved, onResolvedChange]);

  if (resolved || status === 'checking') return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2050, background: 'rgba(15,15,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', boxShadow: '0 16px 44px rgba(0,0,0,0.4)' }}>
        <LocationOnIcon sx={{ fontSize: 40, color: '#dc2626', mb: 1 }} />
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#111' }}>Location access required</div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
          {status === 'unsupported'
            ? "Your browser doesn't support location access — please use a supported browser to continue."
            : "This platform requires location access before you can continue. If you already denied it, enable it from your browser's site settings for this page, then click Try Again."}
        </div>
        {status !== 'unsupported' && (
          <Button variant="contained" onClick={requestLocation} disabled={busy} sx={{ textTransform: 'none' }}>
            {busy ? 'Requesting…' : 'Try Again'}
          </Button>
        )}
      </div>
    </div>
  );
}
