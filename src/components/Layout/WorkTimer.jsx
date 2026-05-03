// Live work-time tracker for non-super_admin users.
// - Polls /work-sessions/current on mount + heartbeats every 60s while active
// - Buttons: Start, Pause, Resume, Stop
// - Once Stop is pressed, Start is disabled for the rest of the day.
//   A "Restart Day" button replaces it; clicking shows a confirm dialog and
//   then opens a new session flagged restart_of_day=true on the backend.
// - Idle auto-logout: if no API call in IDLE_LIMIT_SECONDS, log the user out
// - Daily reset at 00:00 local: any open session is auto-stopped so the
//   "stopped today" gate flips back on for the new calendar day.

import { useEffect, useRef, useState, useCallback } from 'react';
import { Tooltip, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { workSessionsApi, auth, authApi } from '../../lib/endpoints';

const IDLE_LIMIT_SECONDS = 15 * 60; // 15 minutes
const HEARTBEAT_EVERY_MS = 60 * 1000;
const TICK_EVERY_MS = 1000;

const fmt = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
};

// Milliseconds until next local midnight.
const msUntilMidnight = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0); // tomorrow 00:00
  return next.getTime() - now.getTime();
};

export default function WorkTimer() {
  const user = auth.getUser();
  const [state, setState] = useState({ session: null, stoppedToday: false, canStart: true, loading: true });
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const lastApiCallRef = useRef(Date.now());

  // Hide for super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  const reload = useCallback(async () => {
    try {
      const r = await workSessionsApi.current();
      const data = r?.data || {};
      setState({
        session: data.session ?? null,
        stoppedToday: !!data.stopped_today,
        canStart: !!data.can_start,
        loading: false,
      });
      if (data.session?.active_seconds != null) setActiveSeconds(data.session.active_seconds);
      else if (!data.session) setActiveSeconds(0);
      lastApiCallRef.current = Date.now();
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { if (!isSuperAdmin) reload(); }, [isSuperAdmin, reload]);

  // Patch fetch to detect idle (any role with timer enabled).
  useEffect(() => {
    if (isSuperAdmin) return;
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await origFetch.apply(window, args);
      if (res.ok) lastApiCallRef.current = Date.now();
      return res;
    };
    return () => { window.fetch = origFetch; };
  }, [isSuperAdmin]);

  // Tick loop: idle check, heartbeat, local seconds counter.
  useEffect(() => {
    if (isSuperAdmin) return;
    let lastHeartbeat = Date.now();
    const interval = setInterval(async () => {
      const now = Date.now();
      const idleSec = (now - lastApiCallRef.current) / 1000;
      if (idleSec >= IDLE_LIMIT_SECONDS) {
        try { await authApi.logout(); } catch { /* ignore */ }
        auth.clear();
        window.location.href = '/?reason=idle';
        return;
      }
      if (state.session?.status === 'active') {
        setActiveSeconds((v) => v + 1);
      }
      if (state.session && (now - lastHeartbeat) >= HEARTBEAT_EVERY_MS) {
        lastHeartbeat = now;
        try { await workSessionsApi.heartbeat(); } catch { /* ignore */ }
      }
    }, TICK_EVERY_MS);
    return () => clearInterval(interval);
  }, [isSuperAdmin, state.session]);

  // Daily midnight reset: if a session is still open at 00:00, stop it
  // automatically so the "new day" rule kicks in. We schedule a single
  // setTimeout for the exact remaining ms and reschedule after each fire.
  useEffect(() => {
    if (isSuperAdmin) return;
    let timeoutId;
    const schedule = () => {
      timeoutId = setTimeout(async () => {
        try {
          if (state.session) await workSessionsApi.stop();
        } catch { /* ignore */ }
        await reload();
        schedule(); // arm for the next midnight
      }, msUntilMidnight() + 1000); // +1s buffer
    };
    schedule();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [isSuperAdmin, state.session, reload]);

  if (isSuperAdmin) return null;
  if (state.loading) return null;

  const onStart = async () => {
    setBusy(true);
    try { await workSessionsApi.start(); await reload(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };
  const onPause = async () => {
    setBusy(true);
    try { await workSessionsApi.pause(); await reload(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };
  const onResume = async () => {
    setBusy(true);
    try { await workSessionsApi.resume(); await reload(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };
  const onStop = async () => {
    if (!confirm('Stop session? You can use "Restart Day" to start again, but it will be flagged as a manual restart.')) return;
    setBusy(true);
    try { await workSessionsApi.stop(); await reload(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };
  const onRestartDay = async () => {
    setRestartConfirm(false);
    setBusy(true);
    try { await workSessionsApi.restartDay(); await reload(); }
    catch (e) { alert(e.message || 'Failed to restart day'); }
    finally { setBusy(false); }
  };

  const status = state.session?.status; // 'active' | 'paused' | (no session)
  const colorByStatus = { active: '#16a34a', paused: '#f59e0b' }[status] || '#6b7280';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: colorByStatus, minWidth: 78 }}>
          {fmt(activeSeconds)}
        </span>

        {/* Fresh day, no session yet */}
        {!state.session && state.canStart && (
          <Tooltip title="Start work session">
            <span><IconButton size="small" onClick={onStart} disabled={busy} sx={{ color: '#16a34a' }}><PlayArrowIcon /></IconButton></span>
          </Tooltip>
        )}

        {/* Stopped earlier today — show "Stopped" + Restart-day button */}
        {!state.session && !state.canStart && state.stoppedToday && (
          <>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Stopped for today</span>
            <Tooltip title="Restart day (will be flagged as manual restart)">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<RestartAltIcon fontSize="small" />}
                  onClick={() => setRestartConfirm(true)}
                  disabled={busy}
                  sx={{ textTransform: 'none', fontSize: 11, py: 0.25 }}
                >
                  Restart Day
                </Button>
              </span>
            </Tooltip>
          </>
        )}

        {status === 'active' && (
          <>
            <Tooltip title="Pause"><span><IconButton size="small" onClick={onPause} disabled={busy} sx={{ color: '#f59e0b' }}><PauseIcon /></IconButton></span></Tooltip>
            <Tooltip title="Stop (you can restart day with a flag if needed)"><span><IconButton size="small" onClick={onStop} disabled={busy} sx={{ color: '#dc2626' }}><StopIcon /></IconButton></span></Tooltip>
          </>
        )}

        {status === 'paused' && (
          <>
            <Tooltip title="Resume"><span><IconButton size="small" onClick={onResume} disabled={busy} sx={{ color: '#16a34a' }}><PlayArrowIcon /></IconButton></span></Tooltip>
            <Tooltip title="Stop"><span><IconButton size="small" onClick={onStop} disabled={busy} sx={{ color: '#dc2626' }}><StopIcon /></IconButton></span></Tooltip>
          </>
        )}
      </div>

      {/* Restart-day confirm dialog */}
      <Dialog open={restartConfirm} onClose={() => setRestartConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Restart your work day?</DialogTitle>
        <DialogContent>
          <p style={{ margin: 0, color: '#444', fontSize: 14 }}>
            You already stopped your session today. Restarting will create a new
            session and your time-sheet will show this as a <b>manual restart</b>{' '}
            so admins know it wasn't a fresh day.
          </p>
          <p style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
            The original stopped session stays in the audit log.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartConfirm(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={onRestartDay}
            variant="contained"
            color="warning"
            disabled={busy}
            startIcon={<RestartAltIcon fontSize="small" />}
            sx={{ textTransform: 'none' }}
          >
            {busy ? 'Restarting…' : 'Restart Day'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
