import { useEffect, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { auth } from '../../lib/endpoints';

// Server already masks phone-like fields for everyone except super_admin
// (see extraaedge-server lib/leadMasking.js) — this renders that masked
// value with a Reveal control that fetches the real one on demand. Every
// reveal is audit-logged server-side; the real value auto-re-masks after
// REVEAL_MS so it doesn't just stay visible (and copyable) indefinitely.
const REVEAL_MS = 15_000;

export default function MaskedPhone({ value, leadId, reveal, field = 'phone' }) {
  const user = auth.getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (isSuperAdmin || !value) return value || '—';
  if (revealed) return revealed;

  // Only a masked value (contains the bullet mask char) has anything to
  // reveal — an already-empty/dash value just renders as-is.
  const canReveal = /•/.test(value) && reveal && leadId;

  const onReveal = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const r = await reveal(leadId);
      const real = r?.data?.[field];
      if (real) setRevealed(real);
    } catch {
      // Reveal is a convenience action, not a critical path — fail silent.
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span>{value}</span>
      {canReveal && (
        <Tooltip title="Reveal — logged for review">
          <span>
            <IconButton size="small" onClick={onReveal} disabled={busy} sx={{ p: 0.25 }}>
              <VisibilityIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </span>
  );
}
