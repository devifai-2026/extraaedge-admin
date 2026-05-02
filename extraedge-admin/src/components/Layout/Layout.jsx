import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

// Routes where the sidebar is force-collapsed regardless of user preference.
const COLLAPSED_ROUTES = ['/followupmanager'];
const STORAGE_KEY = 'ee_sidebar_collapsed';

function Layout({ children }) {
  const location = useLocation();
  const forcedCollapse = COLLAPSED_ROUTES.includes(location.pathname);
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, userCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [userCollapsed]);

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
    </div>
  );
}

export default Layout;
