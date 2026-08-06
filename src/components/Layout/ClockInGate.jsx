// Hard-blocks the panel for bm/sm/counsellor (anyone with track_work_time)
// until they have an open work session today, spotlighting the real
// Start/Restart control in the header (#work-timer-anchor, see WorkTimer.jsx)
// rather than duplicating its logic. Mirrors the backend's requireClockIn —
// this is UX, not the enforcement; a stale/patched client still hits 403s
// server-side (see lib/api.js dispatching 'ee:clock-in-required').
//
// Silently does nothing for tenants that haven't piloted enforcement yet
// (tenant.clock_in_enforced === false) — matches requireClockIn's own
// per-tenant gate so the UI never blocks more than the API actually does.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { workSessionsApi, auth } from '../../lib/endpoints';

const RECHECK_MS = 20_000;
const ANCHOR_ID = 'work-timer-anchor';
const OVERLAY_BG = 'rgba(15,15,20,0.65)';

export default function ClockInGate({ enabled }) {
  const user = auth.getUser();
  const tenant = auth.getTenant();
  const isSuperAdmin = user?.role === 'super_admin';
  const active = enabled && !isSuperAdmin && !!tenant?.clock_in_enforced;

  const [session, setSession] = useState(null); // undefined session field = not checked yet
  const [rect, setRect] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      const r = await workSessionsApi.current();
      const data = r?.data || {};
      setSession({ hasSession: !!data.session, stoppedToday: !!data.stopped_today });
    } catch {
      // A failed check never blocks by itself — only a confirmed "no
      // session" does. Avoids locking someone out over a network hiccup.
      setSession((s) => s ?? { hasSession: true, stoppedToday: false });
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    check();
    const onFlag = () => check();
    window.addEventListener('ee:clock-in-required', onFlag);
    const interval = setInterval(check, RECHECK_MS);
    return () => {
      window.removeEventListener('ee:clock-in-required', onFlag);
      clearInterval(interval);
    };
  }, [active, check]);

  const open = active && session && !session.hasSession;

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = document.getElementById(ANCHOR_ID);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    // The header can shift slightly as sibling content loads; a light poll
    // is simpler and safer than a ResizeObserver on an ancestor we don't own.
    const interval = setInterval(measure, 1000);
    return () => { window.removeEventListener('resize', measure); clearInterval(interval); };
  }, [open]);

  if (!open) return null;

  const onAction = async () => {
    setBusy(true);
    try {
      await (session.stoppedToday ? workSessionsApi.restartDay() : workSessionsApi.start());
      await check();
    } catch (e) {
      alert(e.message || 'Could not start your timer — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const pad = 10;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const blockerBase = { position: 'fixed', background: OVERLAY_BG };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      {hole ? (
        <>
          {/* Four strips around the hole — nothing at all covers the hole
              itself, so the real header control underneath stays clickable. */}
          <div style={{ ...blockerBase, top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
          <div style={{ ...blockerBase, top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div style={{ ...blockerBase, top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} />
          <div style={{ ...blockerBase, top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          {/* Decorative glow ring, purely visual. */}
          <div
            style={{
              position: 'fixed', ...hole, pointerEvents: 'none', borderRadius: 10,
              boxShadow: '0 0 0 3px #fff, 0 0 28px 6px rgba(255,255,255,0.85)',
              transition: 'top 0.15s, left 0.15s',
            }}
          />
        </>
      ) : (
        <div style={{ ...blockerBase, inset: 0 }} />
      )}

      <div
        style={{
          position: 'fixed',
          top: hole ? hole.top + hole.height + 14 : '50%',
          left: hole ? Math.max(16, Math.min(hole.left, window.innerWidth - 336)) : '50%',
          transform: hole ? 'none' : 'translate(-50%, -50%)',
          width: 320,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 16px 44px rgba(0,0,0,0.4)',
          padding: 20,
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#111' }}>
          {session.stoppedToday ? "You're stopped for today" : 'Start your shift'}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
          {session.stoppedToday
            ? 'Click Restart Day to keep working — this is flagged as a manual restart.'
            : 'Your work timer must be running before you can use leads, follow-ups, calls, or reports.'}
        </div>
        <Button
          fullWidth
          variant="contained"
          startIcon={session.stoppedToday ? <RestartAltIcon /> : <PlayArrowIcon />}
          onClick={onAction}
          disabled={busy}
          sx={{ textTransform: 'none' }}
        >
          {busy ? 'Starting…' : session.stoppedToday ? 'Restart Day' : 'Start Timer'}
        </Button>
      </div>
    </div>
  );
}
