import { useCallback } from 'react';
import { auth } from '../../lib/endpoints';
import { useLeadDataProtection } from './useLeadDataProtection';
import { logSecurityEvent } from './securityEvents';

// Same copy/right-click block + blur-on-unfocus as ProtectedLeadData, but as
// props to SPREAD onto an EXISTING element instead of introducing a new
// wrapper. Use this wherever the existing container's CSS depends on being
// a direct flex/grid child (an extra wrapper div would break that sizing)
// — ProtectedLeadData's Watermark needs its own positioned box, which this
// intentionally skips for exactly that reason. super_admin gets a no-op.
export function useCopyGuard() {
  const user = auth.getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const { isBlurred } = useLeadDataProtection();

  const onCopy = useCallback((e) => {
    if (isSuperAdmin) return;
    e.preventDefault();
    logSecurityEvent('lead.copy_attempt');
  }, [isSuperAdmin]);

  const onContextMenu = useCallback((e) => {
    if (isSuperAdmin) return;
    e.preventDefault();
    logSecurityEvent('lead.contextmenu_attempt');
  }, [isSuperAdmin]);

  if (isSuperAdmin) return { onCopy: undefined, onCut: undefined, onContextMenu: undefined, style: undefined };

  return {
    onCopy,
    onCut: onCopy,
    onContextMenu,
    style: {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      filter: isBlurred ? 'blur(6px)' : 'none',
      transition: 'filter 0.15s ease',
    },
  };
}
