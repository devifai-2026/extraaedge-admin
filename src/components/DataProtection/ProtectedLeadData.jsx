import { useCallback } from 'react';
import { Box } from '@mui/material';
import { auth } from '../../lib/endpoints';
import Watermark from './Watermark';
import { useLeadDataProtection } from './useLeadDataProtection';
import { logSecurityEvent } from './securityEvents';

// Wraps any surface that renders lead data (LeadsTable, LeadList, LeadCard,
// LeadPool, FailedLeads) with the shared deterrence/traceability layer:
// blocks copy/cut/right-click, disables text selection, watermarks with the
// viewer's identity, and blurs while the window is unfocused or devtools is
// suspected open. super_admin is fully exempt — this exists to slow down and
// trace staff we don't fully trust, not the person who already sees
// everything unmasked from the API.
export default function ProtectedLeadData({ children, sx, component = 'div' }) {
  const user = auth.getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const { isBlurred } = useLeadDataProtection();

  const onCopy = useCallback((e) => {
    e.preventDefault();
    logSecurityEvent('lead.copy_attempt');
  }, []);
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    logSecurityEvent('lead.contextmenu_attempt');
  }, []);

  if (isSuperAdmin) return children;

  return (
    <Box
      component={component}
      onCopy={onCopy}
      onCut={onCopy}
      onContextMenu={onContextMenu}
      sx={{
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        filter: isBlurred ? 'blur(6px)' : 'none',
        transition: 'filter 0.15s ease',
        ...sx,
      }}
    >
      {children}
      <Watermark />
    </Box>
  );
}
