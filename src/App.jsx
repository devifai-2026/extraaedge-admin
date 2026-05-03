import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login/Login'
import Layout from './components/Layout/Layout'
import AnalyticsDashboard from './pages/Dashboard/AnalyticsDashboard'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './App.css'
import LeadList from './pages/LeadList/LeadList'
import RawDataManager from './pages/RawDataManager/RawDataManager'
import FailedLeads from './pages/FailedLeads/FailedLeads'
import BulkUploadList from './pages/BulkUplodList/BulkUploadList'
import FollowUpManager from './pages/FollowUpManager/FollowUpManager'
import WhatsAppList from './pages/WhatsAppList/WhatAppsList'
import BulkMarketingCampaign from './pages/BulkMarketingCampaign/BulkMarketingCampaign'
import DripMarketingCampaign from './pages/DripMarketingCampaign/DripMarketingCampaign'
import Remarketing from './pages/Remarketing/Remarketing'
import WorkflowAutomation from './pages/AutomationWorkflow/AutomationWorkflow'
import ConnectedAccounts from './pages/ConnectedAccounts/ConnectedAccounts'
import Settings from './pages/Settings/Settings'
import ThirdPartyIntegration from './pages/ThirdPartyIntegration/ThirdPartyIntegration'
import AdvancedSettings from './pages/AdvancedSettings/AdvancedSettings'
import DropdownsHub from './pages/AdvancedSettings/DropdownsHub'
import DropdownDetail from './pages/AdvancedSettings/DropdownDetail'
import UsersAndRoles from './pages/AdvancedSettings/UsersAndRoles'
import TemplatesHub from './pages/AdvancedSettings/TemplatesHub'
import SubscriptionPage from './pages/AdvancedSettings/SubscriptionPage'
import AssignmentRules from './components/AssignmentRules/AssignmentRules'
import SearchResults from './pages/Search/SearchResults'
import UserProfile from './pages/UserProfile/UserProfile'
import Tickets from './pages/Tickets/Tickets'
import OrgTree from './pages/OrgTree/OrgTree'
import Profile from './pages/Profile/Profile'

// Each route declares the backend tab key it requires.
// `<ProtectedRoute tab="...">` redirects to /dashboard if user lacks access.
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard"            element={<ProtectedRoute tab="dashboard"><Layout><AnalyticsDashboard /></Layout></ProtectedRoute>} />
        <Route path="/leadlist"             element={<ProtectedRoute tab="leads"><Layout><LeadList /></Layout></ProtectedRoute>} />
        <Route path="/search"               element={<ProtectedRoute tab="leads"><Layout><SearchResults /></Layout></ProtectedRoute>} />
        <Route path="/users/:id"            element={<ProtectedRoute tab="advanced.users_roles"><Layout><UserProfile /></Layout></ProtectedRoute>} />
        {/* /profile is open to every authenticated tenant role — each user
            manages their own preferences (theme, etc.). No `tab` gate. */}
        <Route path="/profile"              element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/rawdata"              element={<ProtectedRoute tab="raw_data"><Layout><RawDataManager /></Layout></ProtectedRoute>} />
        <Route path="/failedleads"          element={<ProtectedRoute tab="failed_leads"><Layout><FailedLeads /></Layout></ProtectedRoute>} />
        <Route path="/bulkuploadlist"       element={<ProtectedRoute tab="bulk_upload"><Layout><BulkUploadList /></Layout></ProtectedRoute>} />
        <Route path="/followupmanager"      element={<ProtectedRoute tab="followups"><Layout><FollowUpManager /></Layout></ProtectedRoute>} />
        <Route path="/whatsapplist"         element={<ProtectedRoute tab="whatsapp"><Layout><WhatsAppList /></Layout></ProtectedRoute>} />
        <Route path="/bulkmarketingcampaign" element={<ProtectedRoute tab="bulk_marketing"><Layout><BulkMarketingCampaign /></Layout></ProtectedRoute>} />
        <Route path="/dripmarketingcampaign" element={<ProtectedRoute tab="drip_marketing"><Layout><DripMarketingCampaign /></Layout></ProtectedRoute>} />
        <Route path="/remarketing"          element={<ProtectedRoute tab="remarketing"><Layout><Remarketing /></Layout></ProtectedRoute>} />
        <Route path="/automations"          element={<ProtectedRoute tab="automation"><Layout><WorkflowAutomation /></Layout></ProtectedRoute>} />
        <Route path="/connectedaccounts"    element={<ProtectedRoute tab="connected_accounts"><Layout><ConnectedAccounts /></Layout></ProtectedRoute>} />
        <Route path="/settings"             element={<ProtectedRoute tab="settings.email_templates"><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings"     element={<ProtectedRoute><Layout><AdvancedSettings /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/dropdowns" element={<ProtectedRoute tab="advanced.dropdowns"><Layout><DropdownsHub /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/dropdowns/:type" element={<ProtectedRoute tab="advanced.dropdowns"><Layout><DropdownDetail /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/users" element={<ProtectedRoute tab="advanced.users_roles"><Layout><UsersAndRoles /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/templates" element={<ProtectedRoute tab="advanced.communications"><Layout><TemplatesHub /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/assignment-rules" element={<ProtectedRoute tab="settings.assignment_rules"><Layout><AssignmentRules /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/subscription" element={<ProtectedRoute tab="advanced.subscription"><Layout><SubscriptionPage /></Layout></ProtectedRoute>} />
        <Route path="/thirdpartyintegration" element={<ProtectedRoute tab="third_party_integration"><Layout><ThirdPartyIntegration /></Layout></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/org-tree" element={<ProtectedRoute tab="advanced.users_roles"><Layout><OrgTree /></Layout></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
