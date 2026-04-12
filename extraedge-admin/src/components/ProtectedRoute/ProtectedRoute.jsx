import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  // Check if user is authenticated
  // You can replace this with your actual authentication logic
  const isAuthenticated = localStorage.getItem('token')

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
