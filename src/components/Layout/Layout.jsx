import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BranchSetupDialog from '../BranchSetupDialog/BranchSetupDialog';
import PhoneCaptureDialog from '../PhoneCaptureDialog/PhoneCaptureDialog';
import ClockInGate from './ClockInGate';
import LocationGate from './LocationGate';
import FeedbackPopup from '../FeedbackPopup/FeedbackPopup';
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
  // (b) when the tenant has no branches yet, surfaces the branch-setup gate.
  // super_admin gets the actionable "create your first branch" form; every
  // other role gets a BLOCKING modal that just says "ask your admin to set up
  // a branch" — they can't proceed until the admin does it.
  const isAdmin = auth.getUser()?.role === ROLES.SUPER_ADMIN;
  const [needsBranchSetup, setNeedsBranchSetup] = useState(false);
  // Mandatory phone capture: any tenant user without a phone must set one so
  // their mobile-app call recordings attribute to them. Optimistic from cache,
  // then confirmed by the /auth/me fetch below.
  const [needsPhone, setNeedsPhone] = useState(() => !auth.getUser()?.phone);
  // Resolved once LocationGate either isn't active for this tenant or has
  // successfully captured a GPS fix — gates ClockInGate so the two blocking
  // screens never show stacked at once.
  const [locationResolved, setLocationResolved] = useState(true);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const reveal = (needs) => {
      if (cancelled || !needs) return;
      // Small delay so the dashboard renders first, then the gate appears.
      timer = setTimeout(() => { if (!cancelled) setNeedsBranchSetup(true); }, 2500);
    };
    // Optimistic from cache, then confirm with the server.
    if (auth.getTenantSetup()?.needs_branch_setup) reveal(true);
    authApi.me()
      .then((res) => {
        if (cancelled) return;
        // api client returns the full envelope { data, meta }.
        const me = res?.data ?? res;
        // Cache the fresh user (carries branch_name, branch_id) + allowed_tabs
        // so the navbar / role checks reflect the latest server state.
        if (me?.user) auth.setSession({ user: me.user });
        if (me?.tenant) auth.setSession({ tenant: me.tenant });
        if (me?.allowed_tabs) auth.setSession({ allowed_tabs: me.allowed_tabs });
        if (me?.tenant_setup) auth.setTenantSetup(me.tenant_setup);
        if (me?.tenant_setup?.needs_branch_setup) { if (!timer) reveal(true); }
        else setNeedsBranchSetup(false);
        // Confirm the phone gate against the freshest user record.
        if (me?.user) setNeedsPhone(!me.user.phone);
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
        isAdmin={isAdmin}
        onDone={() => setNeedsBranchSetup(false)}
        onManage={() => { setNeedsBranchSetup(false); navigate('/advancedsettings/branches'); }}
      />
      {/* Phone gate only surfaces once branch setup (if any) is resolved. */}
      <PhoneCaptureDialog
        open={needsPhone && !needsBranchSetup}
        onDone={() => setNeedsPhone(false)}
      />
      {/* Location gate surfaces once branch/phone setup are resolved, before
          the clock-in gate — the two never show stacked (see locationResolved). */}
      <LocationGate
        enabled={!needsBranchSetup && !needsPhone}
        onResolvedChange={setLocationResolved}
      />
      {/* Clock-in gate only surfaces once branch/phone/location are resolved —
          same stacking rule as the phone gate above. */}
      <ClockInGate enabled={!needsBranchSetup && !needsPhone && locationResolved} />
      {/* Recurring feedback popup — only once the blocking gates are cleared,
          so it never stacks on top of branch/phone/location/clock-in setup. */}
      {!needsBranchSetup && !needsPhone && locationResolved ? <FeedbackPopup /> : null}
    </div>
  );
}

export default Layout;
