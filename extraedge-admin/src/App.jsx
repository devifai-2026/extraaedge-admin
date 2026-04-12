import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login/Login'
import Layout from './components/Layout/Layout'
import AnalyticsDashboard from './pages/Dashboard/AnalyticsDashboard'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './App.css'
import LeadList from './pages/LeadList/LeadList'
import RawDataManager from './pages/RawDataManager/RawDataManager'
import FailedLeads from './pages/FailedLeads/FailedLeads'

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

        <Route
          path="/rawdata"
          element={
            <ProtectedRoute>
              <Layout>
                <RawDataManager />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/failedleads"
          element={
            <ProtectedRoute>
              <Layout>
                <FailedLeads />
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
