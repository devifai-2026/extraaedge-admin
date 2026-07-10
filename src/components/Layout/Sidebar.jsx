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
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { hasTab, currentRole, ROLES } from '../../lib/rbac';
import { admissionsApi, leadDiscountsApi } from '../../lib/endpoints';
import { onNotification } from '../../lib/socket';

// ---------------------------------------------------------------------------
// Sidebar navigation model
// ---------------------------------------------------------------------------
// The sidebar is built from three kinds of entry, all driven off this one
// array so adding a future role (Trainer / Student / HR) is a matter of
// dropping a new `section` block in — no render changes required:
//
//   • pinned item   — a flat, always-visible top-level link (no `section`,
//                     no `children`). Used for the two most-used surfaces.
//   • section        — a collapsible, role-named group (`section: true`) with
//                     `children`. Behaves as an accordion (one open at a time).
//   • child          — a link inside a section's `children`.
//
// Every link still declares the `tab` key it maps to (matches
// DEFAULT_TAB_KEYS on the backend) and is filtered against the user's
// allowed_tabs from /auth/login. A section with zero visible children is
// hidden entirely, so role-gating happens automatically.
// ---------------------------------------------------------------------------

// Pinned, ungrouped links shown above all sections. These are the two
// highest-traffic surfaces, kept one click away regardless of which
// section is open.
const pinnedItems = [
  { id: 1, label: 'Analytics Dashboard', icon: DashboardIcon, path: '/dashboard', tab: 'dashboard' },
  { id: 2, label: 'Lead Manager', icon: PeopleAltIcon, path: '/leadlist', tab: 'leads' },
  // Tenant-wide read-only lookup. `tab: 'lead_pool'` is granted to every
  // sales-team role by default, so counsellors get it too.
  { id: 23, label: 'Lead Pool', icon: TravelExploreIcon, path: '/lead-pool', tab: 'lead_pool' },
  // Counsellor-facing admissions: their own converted students. Gated on
  // 'admissions.my_students' (seeded to counsellor), so only they see it.
  { id: 24, label: 'My Students', icon: SchoolIcon, path: '/my-students', tab: 'admissions.my_students', roles: [ROLES.COUNSELLOR] },
  // In-depth payments ledger. `tab: 'payments'` resolves true only for
  // super_admin (allowed_tabs:['*']); all other roles never see this row.
  { id: 19, label: 'Payments Ledger', icon: AccountBalanceWalletIcon, path: '/payments', tab: 'payments' },
];

// Collapsible, role-named sections. Order here is the display order. New
// roles slot in as additional blocks: e.g. a `Trainer` / `Student` / `HR`
// section with its own children + tab keys.
const menuSections = [
  {
    id: 'sales',
    label: 'Sales',
    icon: PeopleAltIcon,
    section: true,
    children: [
      { id: 3, label: 'Raw Data Manager', icon: FolderIcon, path: '/rawdata', tab: 'raw_data' },
      { id: 4, label: 'WhatsApp Chat', icon: WhatsAppIcon, path: '/whatsapplist', tab: 'whatsapp' },
      { id: 5, label: 'Follow-ups Manager', icon: CalendarTodayIcon, path: '/followupmanager', tab: 'followups' },
      { id: 6, label: 'Upload Failed Leads', icon: UploadFileIcon, path: '/failedleads', tab: 'failed_leads' },
      { id: 7, label: 'Bulk Action Stage', icon: SettingsIcon, path: '/bulkuploadlist', tab: 'bulk_upload' },
      { id: 20, label: 'Lead Report', icon: AssessmentIcon, path: '/reports/lead-transfers', tab: 'lead_transfer_report' },
      { id: 21, label: 'Discount Approvals', icon: ChecklistIcon, path: '/discount-approvals', tab: 'lead_transfer_report', badgeKey: 'discount_approvals' },
      { id: 22, label: 'Unmatched Recordings', icon: GraphicEqIcon, path: '/unmatched-recordings', tab: 'unmatched_recordings' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: CampaignIcon,
    section: true,
    children: [
      { id: 8, label: 'Bulk Marketing Campaign', icon: CampaignIcon, path: '/bulkmarketingcampaign', tab: 'bulk_marketing' },
      { id: 9, label: 'Drip Marketing Campaign', icon: Person4Icon, path: '/dripmarketingcampaign', tab: 'drip_marketing' },
      { id: 10, label: 'Remarketing', icon: AdjustIcon, path: '/remarketing', tab: 'remarketing' },
      { id: 11, label: 'Workflow Automation', icon: AutoModeIcon, path: '/automations', tab: 'automation' },
    ],
  },
  {
    // ---------- Admissions & Accounts ----------
    // Tenant-wide post-conversion surfaces. `Admission Pipeline` is the
    // super_admin view; the rest are the account_manager Accounts module.
    // They share a section so post-conversion work lives in one place.
    // `badgeKey: 'pending_admissions'` flags the item whose badge we pull
    // live from the API + socket (see Sidebar() below); when the section
    // is collapsed that badge bubbles up to the section header row.
    id: 'admissions',
    label: 'Admissions',
    icon: SchoolIcon,
    section: true,
    children: [
      { id: 18, label: 'Admission Pipeline',      icon: SchoolIcon,          path: '/admission-pipeline',                  tab: 'admissions.pipeline' },
      { id: 100, label: 'Accounts Dashboard',     icon: DashboardIcon,       path: '/accounts/dashboard',                  tab: 'accounts.dashboard' },
      { id: 109, label: 'Pending Admissions',     icon: PendingActionsIcon,  path: '/accounts/pending-admissions',         tab: 'accounts.pending_admissions', badgeKey: 'pending_admissions' },
      { id: 101, label: 'This Month Admissions',  icon: SchoolIcon,          path: '/accounts/this-month-admissions',      tab: 'accounts.this_month_admissions' },
      { id: 102, label: 'Total Admissions',       icon: SchoolIcon,          path: '/accounts/total-admissions',           tab: 'accounts.total_admissions' },
      { id: 103, label: 'Approvals',              icon: ChecklistIcon,       path: '/accounts/approvals',                  tab: 'accounts.approvals' },
      { id: 104, label: 'Attendings',             icon: HowToRegIcon,        path: '/accounts/attendings',                 tab: 'accounts.attendings' },
      { id: 105, label: 'Break',                  icon: PauseCircleIcon,     path: '/accounts/break',                      tab: 'accounts.break' },
      { id: 111, label: 'Drop Candidates',        icon: PersonOffIcon,       path: '/accounts/drop-candidates',            tab: 'accounts.drop_candidates' },
      { id: 106, label: 'Report',                 icon: AssessmentIcon,      path: '/accounts/report',                     tab: 'accounts.report' },
      { id: 107, label: 'Pay Schedule',           icon: PaymentsIcon,        path: '/accounts/pay-schedule',               tab: 'accounts.pay_schedule' },
      { id: 108, label: 'Collection Receipt-wise',icon: ReceiptLongIcon,     path: '/accounts/collection-receipt-wise',    tab: 'accounts.collection_receipt_wise' },
      { id: 110, label: 'Payment Details',        icon: PaymentsIcon,        path: '/accounts/payment-details',            tab: 'accounts.payment_details' },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: SettingsSuggestIcon,
    section: true,
    children: [
      { id: 12, label: 'Connected Accounts', icon: AccountTreeIcon, path: '/connectedaccounts', tab: 'connected_accounts' },
      { id: 13, label: 'Basic Settings', icon: SettingsIcon, path: '/settings', tab: 'settings.email_templates' },
      { id: 14, label: 'Advanced Settings', icon: SettingsSuggestIcon, path: '/advancedsettings', tab: 'advanced.users_roles' },
      { id: 15, label: 'Third Party Integration', icon: IntegrationInstructionsIcon, path: '/thirdpartyintegration', tab: 'third_party_integration' },
    ],
  },
  // ---- Future roles slot in here as new sections, e.g.: ----
  // { id: 'trainer', label: 'Trainer', icon: SchoolIcon, section: true, children: [ ... ] },
  // { id: 'student', label: 'Student', icon: PeopleAltIcon, section: true, children: [ ... ] },
  // { id: 'hr',      label: 'HR',      icon: Person4Icon,  section: true, children: [ ... ] },
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
  // Which section accordion is currently open. Single value (not a map)
  // because sections behave as an accordion — opening one closes the rest.
  // `undefined` means "no explicit choice yet", in which case the section
  // containing the active route auto-opens. `null` means "explicitly all
  // closed". Persisted across renders but not across reloads.
  const [openSection, setOpenSection] = useState(undefined);
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

  // Pending-discount-approvals badge (BM/SM/admin). Gated on the same tab as
  // the menu item so counsellors never probe the manager-only endpoint. Live
  // via the 'discount.requested'/'discount.decided' socket events + a poll.
  useEffect(() => {
    if (!hasTab('lead_transfer_report')) return undefined;
    let alive = true;
    const refresh = async () => {
      try {
        const r = await leadDiscountsApi.pending();
        if (alive) setBadges((b) => ({ ...b, discount_approvals: (r?.data || []).length }));
      } catch { /* ignore */ }
    };
    refresh();
    const off = onNotification((evt) => {
      if (evt?.type === 'discount.requested' || evt?.type === 'discount.decided') refresh();
    });
    const t = setInterval(refresh, 15_000);
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
  // An item may also carry `roles: [...]` to restrict it to specific roles
  // even when the tab is technically visible (e.g. super_admin's '*' wildcard).
  const roleOk = (item) => !item.roles || item.roles.includes(currentRole());
  const tabOk = (item) => !item.tab || hasTab(item.tab);
  const visibleItems = (items) =>
    items
      .map((item) => {
        if (!item.children) return item;
        const kids = item.children.filter((c) => tabOk(c) && roleOk(c));
        return kids.length ? { ...item, children: kids } : null;
      })
      .filter(Boolean)
      .filter((item) => (item.children || tabOk(item)) && roleOk(item));

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

  const renderItemButton = (item, { isGroup = false, isOpen = false } = {}) => {
    const IconComponent = item.icon;
    const isActive = !item.action && !isGroup && location.pathname === item.path;
    const badgeValue = isGroup && (!isOpen || collapsed) ? groupBadge(item) : liveBadge(item);
    const onClick = () => {
      if (isGroup) {
        // In collapsed (mini) mode the accordion can't expand inline —
        // jump to the first visible child instead so the click isn't a
        // no-op. In expanded mode, accordion-toggle: open this section
        // (closing any other) or close it if it's already open.
        if (collapsed) {
          const first = item.children?.[0];
          if (first?.path) navigate(first.path);
          return;
        }
        setOpenSection((cur) => (cur === item.id ? null : item.id));
        return;
      }
      handleMenuClick(item);
    };
    return (
      <button
        className={`menu-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''} ${isGroup ? 'section-header' : ''}`}
        onClick={onClick}
        style={{
          backgroundColor: isActive ? colors.primary : 'transparent',
          color: isActive ? colors.white : colors.textDark,
          justifyContent: collapsed ? 'center' : 'flex-start',
          // Nesting indent for section children is handled by the
          // `.section-children` left-rail in CSS, so no inline padding here.
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
          // Accordion open state:
          //  • If the user has made an explicit choice this session
          //    (openSection is a string id or null), honour it.
          //  • Otherwise (undefined) auto-open the section that contains
          //    the active route so the current page is always visible.
          const onChildRoute = item.children.some((c) => c.path === location.pathname);
          const isOpen = openSection === undefined ? onChildRoute : openSection === item.id;
          return (
            <li key={item.id}>
              {renderItemButton(item, { isGroup: true, isOpen })}
              {!collapsed && isOpen && (
                <ul className="menu-list section-children">
                  {item.children.map((child) => (
                    <li key={child.id}>{renderItemButton(child)}</li>
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
        <div className="sidebar-top">
          {renderMenuItems(pinnedItems)}
          {!collapsed && <div className="sidebar-divider" />}
          {renderMenuItems(menuSections)}
        </div>
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
