import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BranchSetupDialog from '../BranchSetupDialog/BranchSetupDialog';
import { auth } from '../../lib/api';
import { authApi } from '../../lib/endpoints';
import { ROLES } from '../../lib/rbac';
import './Layout.css';

// Routes where the sidebar is force-collapsed regardless of user preference.
const COLLAPSED_ROUTES = ['/followupmanager'];
const STORAGE_KEY = 'ee_sidebar_collapsed';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const forcedCollapse = COLLAPSED_ROUTES.includes(location.pathname);
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, userCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [userCollapsed]);

  // On mount, refresh /auth/me for EVERY role. This (a) caches the full user
  // incl. branch_name so the navbar can show it (login doesn't carry it), and
  // (b) for a super_admin whose tenant has no branches yet, surfaces the
  // branch-setup prompt a few seconds after landing.
  const [needsBranchSetup, setNeedsBranchSetup] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const isAdmin = auth.getUser()?.role === ROLES.SUPER_ADMIN;
    const reveal = (needs) => {
      if (cancelled || !needs || !isAdmin) return;
      // Small delay so the dashboard renders first, then the prompt appears.
      timer = setTimeout(() => { if (!cancelled) setNeedsBranchSetup(true); }, 2500);
    };
    // Optimistic from cache (admin only), then confirm with the server.
    if (isAdmin && auth.getTenantSetup()?.needs_branch_setup) reveal(true);
    authApi.me()
      .then((res) => {
        if (cancelled) return;
        // api client returns the full envelope { data, meta }.
        const me = res?.data ?? res;
        // Cache the fresh user (carries branch_name, branch_id) + allowed_tabs
        // so the navbar / role checks reflect the latest server state.
        if (me?.user) auth.setSession({ user: me.user });
        if (me?.allowed_tabs) auth.setSession({ allowed_tabs: me.allowed_tabs });
        if (me?.tenant_setup) auth.setTenantSetup(me.tenant_setup);
        if (me?.tenant_setup?.needs_branch_setup && !timer) reveal(true);
        // Let the navbar re-read the cached user without a reload.
        try { window.dispatchEvent(new CustomEvent('ee:user-updated')); } catch { /* no-op */ }
      })
      .catch(() => { /* leave whatever the cache said */ });
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  const collapsed = forcedCollapse || userCollapsed;

  return (
    <div className="layout-wrapper">
      <Header />
      <div className="layout-container">
        <Sidebar
          collapsed={collapsed}
          canToggle={!forcedCollapse}
          onToggle={() => setUserCollapsed((v) => !v)}
        />
        <main className={`layout-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
      <BranchSetupDialog
        open={needsBranchSetup}
        onDone={() => setNeedsBranchSetup(false)}
        onManage={() => { setNeedsBranchSetup(false); navigate('/advancedsettings/branches'); }}
      />
    </div>
  );
}

export default Layout;
