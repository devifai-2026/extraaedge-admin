import { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { auth } from '../../lib/api';
import { viewAsApi } from '../../lib/endpoints';

/**
 * Persistent bar shown while a branch manager is looking at a staff member's
 * screens. Renders nothing when no view-as session is active.
 *
 * Two jobs, and it must never fail at either:
 *   1. Make it impossible to forget whose data is on screen. Someone reading a
 *      counsellor's queue and thinking it is the branch's would draw the wrong
 *      conclusion from every number on the page.
 *   2. Always offer a way out. The view-as token has NO refresh token and
 *      expires in 30 minutes, so the exit path restores the parked session
 *      from localStorage rather than relying on the network.
 */
export default function ViewAsBanner() {
  const [exiting, setExiting] = useState(false);
  const target = auth.getViewAsTarget();
  if (!auth.isViewingAs() || !target) return null;

  const exit = async () => {
    setExiting(true);
    // Tell the server first so the audit row is closed, but never let that
    // decide whether the branch manager gets their own session back: the token
    // may already have expired, which is exactly when someone is most likely
    // to be clicking this. A failed /stop leaves an open row that the 30-minute
    // expiry already accounts for.
    try {
      await viewAsApi.stop();
    } catch {
      /* ignore — restoring the session below matters more */
    }
    auth.stopViewAs();
    // Full reload rather than a route change: allowed_tabs, the sidebar and
    // every open query were built from the view-as token and must be rebuilt
    // from the restored one.
    window.location.href = '/dashboard';
  };

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1,
        bgcolor: '#92400e', color: '#fff',
        position: 'sticky', top: 0, zIndex: 1300,
      }}
    >
      <VisibilityIcon fontSize="small" />
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
        Viewing as {target.name}
        {target.role ? ` (${String(target.role).replace(/_/g, ' ')})` : ''}
      </Typography>
      <Typography sx={{ fontSize: 12, opacity: 0.85, display: { xs: 'none', sm: 'block' } }}>
        — read-only. You are still signed in as yourself; nothing you do here is saved.
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        onClick={exit}
        disabled={exiting}
        sx={{
          color: '#92400e', bgcolor: '#fff', fontWeight: 600, textTransform: 'none',
          '&:hover': { bgcolor: '#fde68a' },
        }}
      >
        {exiting ? <CircularProgress size={16} sx={{ color: '#92400e' }} /> : 'Exit view-as'}
      </Button>
    </Box>
  );
}
