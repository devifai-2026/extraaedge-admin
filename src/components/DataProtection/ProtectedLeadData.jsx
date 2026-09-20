import { useCallback } from 'react';
import { Box } from '@mui/material';
import { auth } from '../../lib/endpoints';
import { useLeadDataProtection } from './useLeadDataProtection';
import { logSecurityEvent } from './securityEvents';

// Wraps any surface that renders lead data (LeadsTable, LeadList, LeadCard,
// LeadPool, FailedLeads) with the shared deterrence layer: blocks
// copy/cut/right-click, disables text selection, and blurs while the window
// is unfocused or devtools is suspected open.
//
// The watermark is NO LONGER rendered here. It moved to <GlobalWatermark/> in
// Layout, which covers every page and every modal instead of only the four
// tables this wrapper happens to be used on. Rendering it here too would
// stack a second, differently-positioned copy on those tables. super_admin is fully exempt — this exists to slow down and
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
    </Box>
  );
}
