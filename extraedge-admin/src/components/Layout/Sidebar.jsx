import { useState } from 'react';
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
import { hasTab } from '../../lib/rbac';

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
];

const bottomMenuItems = [
  { id: 16, label: 'Raise a Ticket', icon: SupportAgentIcon, action: 'modal' },
  { id: 17, label: 'My Tickets', icon: SupportAgentIcon, path: '/tickets' },
];

function Sidebar({ collapsed = false, canToggle = true, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const handleMenuClick = (item) => {
    if (item.action === 'modal') {
      setTicketModalOpen(true);
    } else {
      navigate(item.path);
    }
  };

  // Hide items the user's role doesn't have access to (allowed_tabs from /auth/login).
  const visibleItems = (items) => items.filter((item) => !item.tab || hasTab(item.tab));

  const renderMenuItems = (items) => (
    <ul className="menu-list">
      {visibleItems(items).map((item) => {
        const IconComponent = item.icon;
        const isActive = !item.action && location.pathname === item.path;
        return (
          <li key={item.id}>
            <button
              className={`menu-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
              onClick={() => handleMenuClick(item)}
              style={{
                backgroundColor: isActive ? colors.primary : 'transparent',
                color: isActive ? colors.white : colors.textDark,
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              title={collapsed ? item.label : ''}
            >
              <span className="menu-icon">
                <IconComponent />
              </span>
              {!collapsed && <span className="menu-label">{item.label}</span>}
              {!collapsed && item.badge && <span className="badge">{item.badge}</span>}
            </button>
          </li>
        );
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
