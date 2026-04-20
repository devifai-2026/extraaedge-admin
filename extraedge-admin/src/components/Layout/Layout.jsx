import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

const COLLAPSED_ROUTES = ['/followupmanager']

function Layout({ children }) {
  const location = useLocation()
  const routeForcesCollapse = COLLAPSED_ROUTES.includes(location.pathname)
  const [userCollapsed, setUserCollapsed] = useState(false)

  useEffect(() => {
    if (routeForcesCollapse) setUserCollapsed(true)
  }, [routeForcesCollapse])

  const sidebarCollapsed = userCollapsed || routeForcesCollapse

  return (
    <div className="layout-wrapper">
      <Header />
      <div className="layout-container">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setUserCollapsed((v) => !v)}
        />
        <main className={`layout-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
