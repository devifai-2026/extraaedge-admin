import { Navigate } from 'react-router-dom'
import { auth } from '../../lib/api'
import { hasTab } from '../../lib/rbac'

// Optional `tab` prop gates a route by tab key (matches backend allowed_tabs).
// If user lacks access, they're sent to /dashboard with a query flag.
function ProtectedRoute({ children, tab }) {
  if (!auth.isAuthed()) return <Navigate to="/" replace />
  if (tab && !hasTab(tab)) return <Navigate to="/dashboard?denied=1" replace />
  return children
}

export default ProtectedRoute
