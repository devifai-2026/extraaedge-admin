import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login/Login'
import Layout from './components/Layout/Layout'
import AnalyticsDashboard from './pages/Dashboard/AnalyticsDashboard'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './App.css'
import LeadList from './pages/LeadList/LeadList'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <AnalyticsDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leadlist"
          element={
            <ProtectedRoute>
              <Layout>
                <LeadList />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all - redirect to dashboard for authenticated users, login otherwise */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
