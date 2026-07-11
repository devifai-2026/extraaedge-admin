import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login/Login'
import Layout from './components/Layout/Layout'
import AnalyticsDashboard from './pages/Dashboard/AnalyticsDashboard'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './App.css'
import LeadList from './pages/LeadList/LeadList'
import LeadPool from './pages/LeadPool/LeadPool'
import PaymentsTracker from './pages/Payments/PaymentsTracker'
import LeadTransferReport from './pages/Reports/LeadTransferReport'
import RawDataManager from './pages/RawDataManager/RawDataManager'
import FailedLeads from './pages/FailedLeads/FailedLeads'
import UnmatchedRecordings from './pages/UnmatchedRecordings/UnmatchedRecordings'
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
import Branches from './pages/AdvancedSettings/Branches'
import TenantBranding from './pages/AdvancedSettings/TenantBranding'
import ReceiptSettings from './pages/AdvancedSettings/ReceiptSettings'
import DiscountApprovals from './pages/DiscountApprovals/DiscountApprovals'
import TemplatesHub from './pages/AdvancedSettings/TemplatesHub'
import SubscriptionPage from './pages/AdvancedSettings/SubscriptionPage'
import AssignmentRules from './components/AssignmentRules/AssignmentRules'
import SearchResults from './pages/Search/SearchResults'
import UserProfile from './pages/UserProfile/UserProfile'
import Tickets from './pages/Tickets/Tickets'
import OrgTree from './pages/OrgTree/OrgTree'
import Profile from './pages/Profile/Profile'
// Accounts module (account_manager role) — separate sidebar from the
// sales-team surfaces. All routes live under /accounts/*.
import AccountsDashboard from './pages/Accounts/AccountsDashboard'
import {
  ApprovalsPage,
  AttendingsPage,
  BreakPage,
  DropCandidatesPage,
  ThisMonthAdmissionsPage,
  TotalAdmissionsPage,
} from './pages/Accounts/AdmissionsList'
import MyStudents from './pages/Accounts/MyStudents'
import NewAdmission from './pages/Accounts/NewAdmission'
import AdmissionDetail from './pages/Accounts/AdmissionDetail'
import PaymentDetails from './pages/Accounts/PaymentDetails'
import PendingAdmissions from './pages/Accounts/PendingAdmissions'
import {
  PaySchedulePage,
  CollectionReceiptWisePage,
  AdmissionsReportPage,
} from './pages/Accounts/Reports'
import AdmissionCenters from './pages/AdvancedSettings/AdmissionCenters'
import PaymentAccounts from './pages/AdvancedSettings/PaymentAccounts'
// Public, unauthenticated student-facing admission form. NOT wrapped in
// Layout/ProtectedRoute — the token in the URL is the credential.
import PublicAdmission from './pages/PublicAdmission/PublicAdmission'
import PublicReceipt from './pages/PublicReceipt/PublicReceipt'
import AdmissionPipeline from './pages/AdmissionPipeline/AdmissionPipeline'
// LMS student panel (separate layout + auth from the staff app).
import StudentLogin from './pages/Student/StudentLogin'
import StudentSetPassword from './pages/Student/StudentSetPassword'
import StudentLayout from './pages/Student/StudentLayout'
import StudentDashboard from './pages/Student/StudentDashboard'
import StudentProfile from './pages/Student/StudentProfile'
import StudentAttendance from './pages/Student/StudentAttendance'
import StudentHome from './pages/Student/StudentHome'
import StudentCatalog from './pages/Student/StudentCatalog'
import LmsAnalytics from './pages/LMS/LmsAnalytics'
// LMS trainer pages (staff app, role-gated).
import TrainerCourses from './pages/Trainer/TrainerCourses'
import TrainerCourseDetail from './pages/Trainer/TrainerCourseDetail'
import TrainerClasses from './pages/Trainer/TrainerClasses'
import TrainerRecordings from './pages/Trainer/TrainerRecordings'
import TrainerAnnouncements from './pages/Trainer/TrainerAnnouncements'
import TrainerForum from './pages/Trainer/TrainerForum'
import TrainerTests from './pages/Trainer/TrainerTests'
import TrainerProjects from './pages/Trainer/TrainerProjects'
import TrainerLeaderboard from './pages/Trainer/TrainerLeaderboard'
import TrainerInterviews from './pages/Trainer/TrainerInterviews'
import TrainerPlaceholder from './pages/Trainer/TrainerPlaceholder'
import StudentClasses from './pages/Student/StudentClasses'
import StudentRecordings from './pages/Student/StudentRecordings'
import StudentAnnouncements from './pages/Student/StudentAnnouncements'
import StudentForum from './pages/Student/StudentForum'
import StudentTests from './pages/Student/StudentTests'
import StudentProjects from './pages/Student/StudentProjects'
import StudentLeaderboard from './pages/Student/StudentLeaderboard'
import StudentInterviews from './pages/Student/StudentInterviews'
import StudentMaterials from './pages/Student/StudentMaterials'
import StudentCertificate from './pages/Student/StudentCertificate'
import StudentCapstone from './pages/Student/StudentCapstone'
import StudentHowItWorks from './pages/Student/StudentHowItWorks'
import TrainerMaterials from './pages/Trainer/TrainerMaterials'
import TrainerDashboard from './pages/Trainer/TrainerDashboard'
import TrainerStudents from './pages/Trainer/TrainerStudents'
import HrDashboard from './pages/Hr/HrDashboard'
import HrInterviews from './pages/Hr/HrInterviews'
import PlacementDashboard from './pages/Placement/PlacementDashboard'

// Each route declares the backend tab key it requires.
// `<ProtectedRoute tab="...">` redirects to /dashboard if user lacks access.
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Public student admission form — outside auth + outside Layout.
            The :token comes from the BE share-link generator. */}
        <Route path="/apply/:token" element={<PublicAdmission />} />

        {/* Public receipt view — share URL the accounts team copies. */}
        <Route path="/r/:token" element={<PublicReceipt />} />

        {/* ---- LMS student panel: separate auth + layout from the staff app ---- */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/set-password" element={<StudentSetPassword />} />
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="home" element={<StudentDashboard />} />
          <Route path="course" element={<StudentHome />} />
          <Route path="classes" element={<StudentClasses />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="recordings" element={<StudentRecordings />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
          <Route path="forum" element={<StudentForum />} />
          <Route path="tests" element={<StudentTests />} />
          <Route path="projects" element={<StudentProjects />} />
          <Route path="leaderboard" element={<StudentLeaderboard />} />
          <Route path="interviews" element={<StudentInterviews />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="capstone" element={<StudentCapstone />} />
          <Route path="certificate" element={<StudentCertificate />} />
          <Route path="how-it-works" element={<StudentHowItWorks />} />
          <Route path="catalog" element={<StudentCatalog />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        <Route path="/dashboard"            element={<ProtectedRoute tab="dashboard"><Layout><AnalyticsDashboard /></Layout></ProtectedRoute>} />
        <Route path="/leadlist"             element={<ProtectedRoute tab="leads"><Layout><LeadList /></Layout></ProtectedRoute>} />
        {/* Tenant-wide, read-only Lead Pool — any counsellor (and up) can look
            up ANY lead by name/phone. Gated by the `lead_pool` tab. */}
        <Route path="/lead-pool"            element={<ProtectedRoute tab="lead_pool"><Layout><LeadPool /></Layout></ProtectedRoute>} />
        {/* Standalone, super_admin-only in-depth payments ledger. Sits below
            Lead Manager in the sidebar; reuses /admissions/payment-details. */}
        <Route path="/payments"             element={<ProtectedRoute tab="payments"><Layout><PaymentsTracker /></Layout></ProtectedRoute>} />
        {/* Lead Transfer Report — admin + sales_manager. Telecaller/Counsellor
            performance via the immutable assignment ledger + Excel export. */}
        <Route path="/reports/lead-transfers" element={<ProtectedRoute tab="lead_transfer_report"><Layout><LeadTransferReport /></Layout></ProtectedRoute>} />
        <Route path="/search"               element={<ProtectedRoute tab="leads"><Layout><SearchResults /></Layout></ProtectedRoute>} />
        <Route path="/users/:id"            element={<ProtectedRoute tab="advanced.users_roles"><Layout><UserProfile /></Layout></ProtectedRoute>} />
        {/* /profile is open to every authenticated tenant role — each user
            manages their own preferences (theme, etc.). No `tab` gate. */}
        <Route path="/profile"              element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/rawdata"              element={<ProtectedRoute tab="raw_data"><Layout><RawDataManager /></Layout></ProtectedRoute>} />
        <Route path="/unmatched-recordings" element={<ProtectedRoute tab="unmatched_recordings"><Layout><UnmatchedRecordings /></Layout></ProtectedRoute>} />
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
        <Route path="/advancedsettings/branding" element={<ProtectedRoute><Layout><TenantBranding /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/receipts" element={<ProtectedRoute><Layout><ReceiptSettings /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/dropdowns" element={<ProtectedRoute tab="advanced.dropdowns"><Layout><DropdownsHub /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/dropdowns/:type" element={<ProtectedRoute tab="advanced.dropdowns"><Layout><DropdownDetail /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/users" element={<ProtectedRoute tab="advanced.users_roles"><Layout><UsersAndRoles /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/branches" element={<ProtectedRoute tab="advanced.users_roles"><Layout><Branches /></Layout></ProtectedRoute>} />
        <Route path="/discount-approvals" element={<ProtectedRoute tab="lead_transfer_report"><Layout><DiscountApprovals /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/templates" element={<ProtectedRoute tab="advanced.communications"><Layout><TemplatesHub /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/assignment-rules" element={<ProtectedRoute tab="settings.assignment_rules"><Layout><AssignmentRules /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/subscription" element={<ProtectedRoute tab="advanced.subscription"><Layout><SubscriptionPage /></Layout></ProtectedRoute>} />
        <Route path="/thirdpartyintegration" element={<ProtectedRoute tab="third_party_integration"><Layout><ThirdPartyIntegration /></Layout></ProtectedRoute>} />
        {/* Admin: post-conversion admission pipeline overview. */}
        <Route path="/admission-pipeline" element={<ProtectedRoute tab="admissions.pipeline"><Layout><AdmissionPipeline /></Layout></ProtectedRoute>} />
        {/* Counsellor: their own converted students (configure offer + send link). */}
        <Route path="/my-students" element={<ProtectedRoute tab="admissions.my_students"><Layout><MyStudents /></Layout></ProtectedRoute>} />

        {/* ---- LMS trainer surfaces (staff app, role-gated by trainer.* tabs) ---- */}
        <Route path="/trainer/dashboard" element={<ProtectedRoute tab="trainer.classes"><Layout><TrainerDashboard /></Layout></ProtectedRoute>} />
        <Route path="/trainer/students" element={<ProtectedRoute tab="trainer.classes"><Layout><TrainerStudents /></Layout></ProtectedRoute>} />
        <Route path="/hr/dashboard" element={<ProtectedRoute tab="hr.dashboard"><Layout><HrDashboard /></Layout></ProtectedRoute>} />
        <Route path="/hr/interviews" element={<ProtectedRoute tab="hr.interviews"><Layout><HrInterviews /></Layout></ProtectedRoute>} />
        <Route path="/placement/dashboard" element={<ProtectedRoute tab="placement.dashboard"><Layout><PlacementDashboard /></Layout></ProtectedRoute>} />
        <Route path="/trainer/courses" element={<ProtectedRoute tab="trainer.classes"><Layout><TrainerCourses /></Layout></ProtectedRoute>} />
        <Route path="/trainer/courses/:programId" element={<ProtectedRoute tab="trainer.classes"><Layout><TrainerCourseDetail /></Layout></ProtectedRoute>} />
        <Route path="/trainer/classes" element={<ProtectedRoute tab="trainer.classes"><Layout><TrainerClasses /></Layout></ProtectedRoute>} />
        <Route path="/trainer/attendance" element={<ProtectedRoute tab="trainer.attendance"><Layout><TrainerClasses /></Layout></ProtectedRoute>} />
        <Route path="/trainer/recordings" element={<ProtectedRoute tab="trainer.recordings"><Layout><TrainerRecordings /></Layout></ProtectedRoute>} />
        <Route path="/trainer/announcements" element={<ProtectedRoute tab="trainer.announcements"><Layout><TrainerAnnouncements /></Layout></ProtectedRoute>} />
        <Route path="/trainer/forum" element={<ProtectedRoute tab="trainer.forum"><Layout><TrainerForum /></Layout></ProtectedRoute>} />
        <Route path="/trainer/tests" element={<ProtectedRoute tab="trainer.tests"><Layout><TrainerTests /></Layout></ProtectedRoute>} />
        <Route path="/trainer/projects" element={<ProtectedRoute tab="trainer.projects"><Layout><TrainerProjects /></Layout></ProtectedRoute>} />
        <Route path="/trainer/interviews" element={<ProtectedRoute tab="trainer.interviews"><Layout><TrainerInterviews /></Layout></ProtectedRoute>} />
        <Route path="/trainer/leaderboard" element={<ProtectedRoute tab="trainer.leaderboard"><Layout><TrainerLeaderboard /></Layout></ProtectedRoute>} />
        <Route path="/trainer/materials" element={<ProtectedRoute tab="trainer.materials"><Layout><TrainerMaterials /></Layout></ProtectedRoute>} />
        {/* Admin + branch-manager LMS analytics + student sudo-login. */}
        <Route path="/lms/analytics" element={<ProtectedRoute tab="lms.analytics"><Layout><LmsAnalytics /></Layout></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>} />
        <Route path="/advancedsettings/org-tree" element={<ProtectedRoute tab="advanced.users_roles"><Layout><OrgTree /></Layout></ProtectedRoute>} />
        {/* Admission centers (Accounts module dropdown — managed by super_admin) */}
        <Route path="/advancedsettings/admission-centers" element={<ProtectedRoute tab="advanced.dropdowns"><Layout><AdmissionCenters /></Layout></ProtectedRoute>} />
        {/* Payment accounts (bank + UPI for collecting fee payments — super_admin) */}
        <Route path="/advancedsettings/payment-accounts" element={<ProtectedRoute tab="advanced.payment_accounts"><Layout><PaymentAccounts /></Layout></ProtectedRoute>} />

        {/* ---------- Accounts module (account_manager) ---------- */}
        <Route path="/accounts/dashboard"                element={<ProtectedRoute tab="accounts.dashboard"><Layout><AccountsDashboard /></Layout></ProtectedRoute>} />
        <Route path="/accounts/pending-admissions"       element={<ProtectedRoute tab="accounts.pending_admissions"><Layout><PendingAdmissions /></Layout></ProtectedRoute>} />
        <Route path="/accounts/this-month-admissions"    element={<ProtectedRoute tab="accounts.this_month_admissions"><Layout><ThisMonthAdmissionsPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/total-admissions"         element={<ProtectedRoute tab="accounts.total_admissions"><Layout><TotalAdmissionsPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/approvals"                element={<ProtectedRoute tab="accounts.approvals"><Layout><ApprovalsPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/attendings"               element={<ProtectedRoute tab="accounts.attendings"><Layout><AttendingsPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/break"                    element={<ProtectedRoute tab="accounts.break"><Layout><BreakPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/drop-candidates"          element={<ProtectedRoute tab="accounts.drop_candidates"><Layout><DropCandidatesPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/report"                   element={<ProtectedRoute tab="accounts.report"><Layout><AdmissionsReportPage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/pay-schedule"             element={<ProtectedRoute tab="accounts.pay_schedule"><Layout><PaySchedulePage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/collection-receipt-wise"  element={<ProtectedRoute tab="accounts.collection_receipt_wise"><Layout><CollectionReceiptWisePage /></Layout></ProtectedRoute>} />
        <Route path="/accounts/payment-details"          element={<ProtectedRoute tab="accounts.payment_details"><Layout><PaymentDetails /></Layout></ProtectedRoute>} />
        {/* Admission form — `:leadId?` is optional; when present we hydrate from /leads/:id */}
        <Route path="/accounts/new-admission"            element={<ProtectedRoute tab="accounts.approvals"><Layout><NewAdmission /></Layout></ProtectedRoute>} />
        <Route path="/accounts/new-admission/:leadId"    element={<ProtectedRoute tab="accounts.approvals"><Layout><NewAdmission /></Layout></ProtectedRoute>} />
        <Route path="/accounts/admission/:id"            element={<ProtectedRoute tab="accounts.approvals"><Layout><AdmissionDetail /></Layout></ProtectedRoute>} />
        <Route path="/accounts/admission/:id/edit"       element={<ProtectedRoute tab="accounts.approvals"><Layout><NewAdmission /></Layout></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
