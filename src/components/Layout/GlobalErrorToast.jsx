// One app-wide toast for permission denials.
//
// WHY THIS EXISTS: the server refuses plenty of actions with a 403 (branch
// managers are read-only, field permissions, tab grants), but the client had
// no shared way to say so. Of the ~200 API call sites, most either swallow the
// error in a bare `catch {}` or drop it into inline text somewhere off-screen,
// so a blocked click looked like a no-op — the restriction got reported as
// "the button does nothing" rather than "I'm not allowed to do that".
//
// api.js broadcasts `ee:forbidden` from its error path (next to the existing
// CLOCK_IN_REQUIRED dispatch); this listens once, mounted in Layout, so every
// 403 gets an explanation regardless of which call site triggered it.
import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const GlobalErrorToast = () => {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    // A single click can fan out into several parallel requests that all 403
    // (a page loading four widgets, say). Collapse them: keep the first
    // message and ignore repeats of the same text while it's still showing,
    // so the user gets one clear toast instead of a stack of identical ones.
    const onForbidden = (e) => {
      const text = e?.detail?.message
        || 'You do not have permission to do that.';
      setMsg((prev) => (prev === text ? prev : text));
    };
    window.addEventListener('ee:forbidden', onForbidden);
    return () => window.removeEventListener('ee:forbidden', onForbidden);
  }, []);

  return (
    <Snackbar
      open={!!msg}
      // Longer than the usual 3s: these messages explain a policy ("branch
      // managers have read-only access…") and are worth actually reading.
      autoHideDuration={6000}
      onClose={() => setMsg(null)}
      // Top-right matches LeadList's toast, which was moved off the bottom so
      // it stops covering modal action buttons — a denial usually fires from
      // inside a modal, so that matters here too.
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {msg ? (
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setMsg(null)}
          sx={{ maxWidth: 460, whiteSpace: 'pre-line' }}
        >
          {msg}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};

export default GlobalErrorToast;
