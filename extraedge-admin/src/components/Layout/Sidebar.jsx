import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FolderIcon from '@mui/icons-material/Folder';
import ChatIcon from '@mui/icons-material/Chat';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { colors } from '../../theme/colors';
import './Sidebar.css';

const menuItems = [
  { id: 1, label: 'Analytics Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { id: 2, label: 'Lead Manager', icon: PeopleAltIcon, path: '/leadlist' },
  { id: 3, label: 'Raw Data Manager', icon: FolderIcon, path: '/raw-data-manager' },
  { id: 4, label: 'WhatsApp Chat', icon: WhatsAppIcon, path: '/whatsapp-chat', badge: '12' },
  { id: 5, label: 'Follow-ups Manager', icon: CalendarTodayIcon, path: '/followups-manager' },
  { id: 6, label: 'Upload Failed Leads', icon: UploadFileIcon, path: '/upload-failed-leads' },
  { id: 7, label: 'Bulk Action Stage', icon: SettingsIcon, path: '/bulk-action-stage' },
];

const bottomMenuItems = [
  { id: 8, label: 'Raise a Ticket', icon: SupportAgentIcon, path: '/raise-ticket' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (path) => {
    navigate(path);
  };

  const renderMenuItems = (items) => (
    <ul className="menu-list">
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <li key={item.id}>
            <button
              className={`menu-item ${isActive ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.path)}
              style={{
                backgroundColor: isActive ? colors.primary : 'transparent',
                color: isActive ? colors.white : colors.textDark,
              }}
            >
              <span className="menu-icon">
                <IconComponent />
              </span>
              <span className="menu-label">{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      className="sidebar"
      style={{ backgroundColor: colors.white, borderRight: `1px solid ${colors.borderGray}` }}
    >
      <div className="sidebar-top">{renderMenuItems(menuItems)}</div>
      <div className="sidebar-bottom">{renderMenuItems(bottomMenuItems)}</div>
    </div>
  );
}

export default Sidebar;