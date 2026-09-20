import { useEffect, useState, useSyncExternalStore } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { auth } from '../../lib/endpoints';
import {
  MAX_REVEALED, subscribe, isOpen, openReveal, closeReveal,
} from './revealRegistry';

// Server already masks phone-like fields for everyone except super_admin
// (see extraaedge-server lib/leadMasking.js) — this renders that masked
// value with a Reveal control that fetches the real one on demand. Every
// reveal is audit-logged server-side; the real value auto-re-masks after
// REVEAL_MS so it doesn't just stay visible (and copyable) indefinitely.
//
// At most MAX_REVEALED numbers are open at once across the whole page: these
// components are siblings in a table with no shared parent, so the cap lives
// in a module-level registry they all subscribe to (revealRegistry.js).
// Revealing a 4th re-masks the oldest.
const REVEAL_MS = 15_000;

export default function MaskedPhone({ value, leadId, reveal, field = 'phone' }) {
  const user = auth.getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);
  // One key per lead+field, so a lead's phone and whatsapp count separately.
  const key = `${leadId || ''}:${field}`;

  // Re-render when ANOTHER MaskedPhone opens and pushes this one out of the
  // window. useSyncExternalStore keeps that in step with React's rendering.
  const stillOpen = useSyncExternalStore(
    subscribe,
    () => isOpen(key),
    () => false,
  );

  // Evicted by someone else's reveal — drop the plaintext we are holding.
  useEffect(() => {
    if (!stillOpen && revealed) setRevealed(null);
  }, [stillOpen, revealed]);

  // Existing per-reveal timeout, unchanged: a number nobody evicts still
  // re-masks itself. Deregisters so it stops occupying a slot.
  useEffect(() => {
    if (!revealed) return undefined;
    const timer = setTimeout(() => { closeReveal(key); setRevealed(null); }, REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed, key]);

  // Release the slot if this row unmounts while open (pagination, filtering).
  useEffect(() => () => closeReveal(key), [key]);

  if (isSuperAdmin || !value) return value || '—';
  if (revealed && stillOpen) return revealed;

  // Only a masked value (contains the bullet mask char) has anything to
  // reveal — an already-empty/dash value just renders as-is.
  const canReveal = /•/.test(value) && reveal && leadId;

  const onReveal = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const r = await reveal(leadId);
      const real = r?.data?.[field];
      if (real) {
        // Claim a slot first — this is what evicts the oldest reveal.
        openReveal(key);
        setRevealed(real);
      }
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
        <Tooltip title={`Reveal — logged for review (max ${MAX_REVEALED} at a time)`}>
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
