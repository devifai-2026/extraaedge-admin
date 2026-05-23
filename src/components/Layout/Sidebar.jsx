import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FolderIcon from '@mui/icons-material/Folder';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { colors } from '../../theme/colors';
import RaiseTicketModal from './RaiseTicketModal';
import './Sidebar.css';
import CampaignIcon from '@mui/icons-material/Campaign';
import Person4Icon from '@mui/icons-material/Person4';
import AdjustIcon from '@mui/icons-material/Adjust';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SchoolIcon from '@mui/icons-material/School';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import InsightsIcon from '@mui/icons-material/Insights';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { hasTab } from '../../lib/rbac';
import { admissionsApi } from '../../lib/endpoints';
import { onNotification } from '../../lib/socket';

// Each menu item declares the tab key it maps to (matches DEFAULT_TAB_KEYS on backend).
// Items are filtered against the user's allowed_tabs from /auth/login.
const menuItems = [
  { id: 1, label: 'Analytics Dashboard', icon: DashboardIcon, path: '/dashboard', tab: 'dashboard' },
  { id: 2, label: 'Lead Manager', icon: PeopleAltIcon, path: '/leadlist', tab: 'leads' },
  { id: 3, label: 'Raw Data Manager', icon: FolderIcon, path: '/rawdata', tab: 'raw_data' },
  { id: 4, label: 'WhatsApp Chat', icon: WhatsAppIcon, path: '/whatsapplist', tab: 'whatsapp' },
  { id: 5, label: 'Follow-ups Manager', icon: CalendarTodayIcon, path: '/followupmanager', tab: 'followups' },
  { id: 6, label: 'Upload Failed Leads', icon: UploadFileIcon, path: '/failedleads', tab: 'failed_leads' },
  { id: 7, label: 'Bulk Action Stage', icon: SettingsIcon, path: '/bulkuploadlist', tab: 'bulk_upload' },
  { id: 8, label: 'Bulk Marketing Campaign', icon: CampaignIcon, path: '/bulkmarketingcampaign', tab: 'bulk_marketing' },
  { id: 9, label: 'Drip Marketing Campaign', icon: Person4Icon, path: '/dripmarketingcampaign', tab: 'drip_marketing' },
  { id: 10, label: 'Remarketing', icon: AdjustIcon, path: '/remarketing', tab: 'remarketing' },
  { id: 11, label: 'Workflow Automation', icon: AutoModeIcon, path: '/automations', tab: 'automation' },
  { id: 12, label: 'Connected Accounts', icon: AccountTreeIcon, path: '/connectedaccounts', tab: 'connected_accounts' },
  { id: 13, label: 'Basic Settings', icon: SettingsIcon, path: '/settings', tab: 'settings.email_templates' },
  { id: 14, label: 'Advanced Settings', icon: SettingsSuggestIcon, path: '/advancedsettings', tab: 'advanced.users_roles' },
  { id: 15, label: 'Third Party Integration', icon: IntegrationInstructionsIcon, path: '/thirdpartyintegration', tab: 'third_party_integration' },
  // Tenant-wide post-conversion pipeline view for admins. Sits in the
  // main sidebar (not Accounts) so super_admins see admission status
  // alongside lead-pipeline items without context-switching.
  { id: 18, label: 'Admission Pipeline', icon: SchoolIcon, path: '/admission-pipeline', tab: 'admissions.pipeline' },

  // ---------- Accounts module (account_manager role) ----------
  // All Accounts items collapse under a single "Accounts Insights" parent
  // that expands inline. Per-child RBAC still applies (each child carries
  // its own `tab` key) and the parent is hidden entirely when the user has
  // access to zero children. Pending Admissions keeps its live badge; when
  // the parent is collapsed, that badge bubbles up to the parent row.
  {
    id: 99,
    label: 'Accounts Insights',
    icon: InsightsIcon,
    group: 'accounts',
    children: [
      { id: 100, label: 'Dashboard',              icon: DashboardIcon,       path: '/accounts/dashboard',                  tab: 'accounts.dashboard' },
      // `badgeKey: 'pending_admissions'` flags this item as one whose badge
      // we should pull live from the API + socket. See Sidebar() below.
      { id: 109, label: 'Pending Admissions',     icon: PendingActionsIcon,  path: '/accounts/pending-admissions',         tab: 'accounts.pending_admissions', badgeKey: 'pending_admissions' },
      { id: 101, label: 'This Month Admissions',  icon: SchoolIcon,          path: '/accounts/this-month-admissions',      tab: 'accounts.this_month_admissions' },
      { id: 102, label: 'Total Admissions',       icon: SchoolIcon,          path: '/accounts/total-admissions',           tab: 'accounts.total_admissions' },
      { id: 103, label: 'Approvals',              icon: ChecklistIcon,       path: '/accounts/approvals',                  tab: 'accounts.approvals' },
      { id: 104, label: 'Attendings',             icon: HowToRegIcon,        path: '/accounts/attendings',                 tab: 'accounts.attendings' },
      { id: 105, label: 'Break',                  icon: PauseCircleIcon,     path: '/accounts/break',                      tab: 'accounts.break' },
      { id: 106, label: 'Report',                 icon: AssessmentIcon,      path: '/accounts/report',                     tab: 'accounts.report' },
      { id: 107, label: 'Pay Schedule',           icon: PaymentsIcon,        path: '/accounts/pay-schedule',               tab: 'accounts.pay_schedule' },
      { id: 108, label: 'Collection Receipt-wise',icon: ReceiptLongIcon,     path: '/accounts/collection-receipt-wise',    tab: 'accounts.collection_receipt_wise' },
    ],
  },
];

const bottomMenuItems = [
  { id: 16, label: 'Raise a Ticket', icon: SupportAgentIcon, action: 'modal' },
  { id: 17, label: 'My Tickets', icon: SupportAgentIcon, path: '/tickets' },
];

function Sidebar({ collapsed = false, canToggle = true, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  // Live badge counters keyed by `badgeKey` on the menu item. Only one
  // counter today (pending_admissions) but the shape makes adding more
  // a one-line change. Skipped entirely when the user can't see the
  // corresponding tab so we don't probe the API as a counsellor.
  const [badges, setBadges] = useState({});
  // Which group accordions are currently open. Persisted across renders
  // but not across reloads — opening behaviour is driven by current route
  // (auto-open the group containing the active child).
  const [openGroups, setOpenGroups] = useState({});
  useEffect(() => {
    if (!hasTab('accounts.pending_admissions')) return undefined;
    let alive = true;
    const refresh = async () => {
      try {
        const r = await admissionsApi.pendingAdmissionsCount();
        if (alive) setBadges((b) => ({ ...b, pending_admissions: r?.data?.pending || 0 }));
      } catch { /* ignore */ }
    };
    refresh();
    // Socket: backend emits 'admission.pending' on every lead conversion
    // / stub insert; bump count immediately for a snappy badge.
    const off = onNotification((evt) => {
      if (evt?.type === 'admission.pending') refresh();
    });
    // 10-second poll. Faster than the old 60s fallback because the socket
    // can drop quietly (e.g. on tab sleep / VPN reconnect) and accounts
    // managers actively watch this badge — staleness is more visible
    // than the bandwidth cost of one tiny COUNT query.
    const t = setInterval(refresh, 10_000);
    return () => { alive = false; off(); clearInterval(t); };
  }, []);

  const handleMenuClick = (item) => {
    if (item.action === 'modal') {
      setTicketModalOpen(true);
    } else {
      navigate(item.path);
    }
  };

  // Hide items the user's role doesn't have access to (allowed_tabs from
  // /auth/login). For group items, also strip children the user can't see
  // and drop the group entirely if nothing's left under it.
  const visibleItems = (items) =>
    items
      .map((item) => {
        if (!item.children) return item;
        const kids = item.children.filter((c) => !c.tab || hasTab(c.tab));
        return kids.length ? { ...item, children: kids } : null;
      })
      .filter(Boolean)
      .filter((item) => item.children || !item.tab || hasTab(item.tab));

  const liveBadge = (item) => {
    const live = item.badgeKey ? badges[item.badgeKey] : null;
    return item.badge ?? (live > 0 ? live : null);
  };

  // Sum of child badges — shown on the parent row when the group is
  // collapsed (or the sidebar is in mini mode), so pending counts don't
  // disappear behind a closed accordion.
  const groupBadge = (item) =>
    item.children?.reduce((sum, c) => {
      const v = liveBadge(c);
      return typeof v === 'number' ? sum + v : sum;
    }, 0) || null;

  const renderItemButton = (item, { depth = 0, isGroup = false, isOpen = false } = {}) => {
    const IconComponent = item.icon;
    const isActive = !item.action && !isGroup && location.pathname === item.path;
    const badgeValue = isGroup && (!isOpen || collapsed) ? groupBadge(item) : liveBadge(item);
    const onClick = () => {
      if (isGroup) {
        // In collapsed (mini) mode the accordion can't expand inline —
        // jump to the first visible child instead so the click isn't a
        // no-op. In expanded mode, toggle.
        if (collapsed) {
          const first = item.children?.[0];
          if (first?.path) navigate(first.path);
          return;
        }
        setOpenGroups((g) => ({ ...g, [item.id]: !g[item.id] }));
        return;
      }
      handleMenuClick(item);
    };
    return (
      <button
        className={`menu-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
        onClick={onClick}
        style={{
          backgroundColor: isActive ? colors.primary : 'transparent',
          color: isActive ? colors.white : colors.textDark,
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: !collapsed && depth > 0 ? 20 + depth * 20 : undefined,
        }}
        title={collapsed ? item.label : ''}
      >
        <span className="menu-icon" style={{ position: 'relative' }}>
          <IconComponent />
          {/* When the sidebar is collapsed we still want the user to
              see something's pending — show a tiny red dot on the
              icon itself instead of the (hidden) right-side badge. */}
          {collapsed && badgeValue ? (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 8, height: 8, borderRadius: '50%',
              background: '#dc2626',
              boxShadow: '0 0 0 2px white',
            }} />
          ) : null}
        </span>
        {!collapsed && <span className="menu-label">{item.label}</span>}
        {!collapsed && badgeValue != null && badgeValue !== 0 && (
          <span className="badge" style={{
            background: '#dc2626', color: '#fff',
            borderRadius: 10, padding: '2px 7px',
            fontSize: 11, fontWeight: 700, marginLeft: 'auto',
            fontVariantNumeric: 'tabular-nums',
          }}>{badgeValue}</span>
        )}
        {!collapsed && isGroup && (
          <span style={{ marginLeft: badgeValue ? 6 : 'auto', display: 'flex', alignItems: 'center' }}>
            {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </span>
        )}
      </button>
    );
  };

  const renderMenuItems = (items) => (
    <ul className="menu-list">
      {visibleItems(items).map((item) => {
        if (item.children) {
          // Auto-expand the group when we're sitting on one of its
          // children, even if the user hasn't toggled it open this
          // session. Explicit close (openGroups[id] === false) wins.
          const onChildRoute = item.children.some((c) => c.path === location.pathname);
          const isOpen = openGroups[item.id] ?? onChildRoute;
          return (
            <li key={item.id}>
              {renderItemButton(item, { isGroup: true, isOpen })}
              {!collapsed && isOpen && (
                <ul className="menu-list">
                  {item.children.map((child) => (
                    <li key={child.id}>{renderItemButton(child, { depth: 1 })}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        }
        return <li key={item.id}>{renderItemButton(item)}</li>;
      })}
    </ul>
  );

  return (
    <>
      <div
        className={`sidebar ${collapsed ? 'sidebar-mini' : ''}`}
        style={{ backgroundColor: colors.white, borderRight: `1px solid ${colors.borderGrey}` }}
      >
        <div className="sidebar-top">{renderMenuItems(menuItems)}</div>
        <div className="sidebar-bottom">{renderMenuItems(bottomMenuItems)}</div>
      </div>
      {canToggle && (
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'fixed',
            top: 84,
            left: collapsed ? 44 : 268,
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `1px solid ${colors.borderGrey}`,
            background: colors.white,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            padding: 0,
            transition: 'left 200ms ease',
          }}
        >
          {collapsed
            ? <ChevronRightIcon sx={{ fontSize: 16, color: colors.primary }} />
            : <ChevronLeftIcon sx={{ fontSize: 16, color: colors.primary }} />
          }
        </button>
      )}
      <RaiseTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </>
  );
}

export default Sidebar;
