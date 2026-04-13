import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

const COLLAPSED_ROUTES = ['/followupmanager']

function Layout({ children }) {
  const location = useLocation()
  const sidebarCollapsed = COLLAPSED_ROUTES.includes(location.pathname)

  return (
    <div className="layout-wrapper">
      <Header />
      <div className="layout-container">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={`layout-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
