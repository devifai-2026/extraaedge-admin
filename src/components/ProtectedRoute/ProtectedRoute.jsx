import { useLocation, Navigate } from 'react-router-dom'
import { auth } from '../../lib/api'
import { hasTab, firstAllowedRoute } from '../../lib/rbac'

// Optional `tab` prop gates a route by tab key (matches backend allowed_tabs).
// If the user lacks access, they're sent to the first route their role
// CAN access — never to a route gated on the tab they were just denied,
// which used to cause a redirect loop and crash the app.
function ProtectedRoute({ children, tab }) {
  const location = useLocation()
  if (!auth.isAuthed()) return <Navigate to="/" replace />
  if (tab && !hasTab(tab)) {
    const fallback = firstAllowedRoute()
    // If the fallback IS the route we just denied, don't navigate — that
    // would loop. Render a minimal "no access" state instead.
    if (fallback === location.pathname) {
      return (
        <div style={{
          padding: 40, textAlign: 'center', color: '#6b7280',
          minHeight: 'calc(100vh - 100px)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>You don&apos;t have access to any tabs.</div>
          <div style={{ fontSize: 13 }}>Ask your administrator to grant you access to at least one tab.</div>
        </div>
      )
    }
    return <Navigate to={`${fallback}?denied=1`} replace />
  }
  return children
}

export default ProtectedRoute
