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

const menuItems = [
  { id: 1, label: 'Analytics Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { id: 2, label: 'Lead Manager', icon: PeopleAltIcon, path: '/leadlist' },
  { id: 3, label: 'Raw Data Manager', icon: FolderIcon, path: '/rawdata' },
  { id: 4, label: 'WhatsApp Chat', icon: WhatsAppIcon, path: '/whatsapplist', badge: '12' },
  { id: 5, label: 'Follow-ups Manager', icon: CalendarTodayIcon, path: '/followupmanager' },
  { id: 6, label: 'Upload Failed Leads', icon: UploadFileIcon, path: '/failedleads' },
  { id: 7, label: 'Bulk Action Stage', icon: SettingsIcon, path: '/bulkuploadlist' },
];

const bottomMenuItems = [
  { id: 8, label: 'Raise a Ticket', icon: SupportAgentIcon, action: 'modal' },
];

function Sidebar({ collapsed = false }) {
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

  const renderMenuItems = (items) => (
    <ul className="menu-list">
      {items.map((item) => {
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
      <RaiseTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </>
  );
}

export default Sidebar;
