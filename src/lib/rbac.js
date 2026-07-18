// Role-based access control helpers for the tenant CRM.
// Source of truth: the backend `requireRole(...)` middleware + `allowed_tabs` returned by /auth/login.
// We mirror those checks on the client to hide unauthorized UI; the backend is the real enforcer.

import { auth } from './api';

// ---------- Role buckets (matches the image) ----------
// Institute Owners → super_admin
// Sales Managers   → sales_manager
// Counsellors      → counsellor
// (Students/Leads are external, not application users.)
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  // Branch head. Admin-like access, scoped to their branch (enforced
  // server-side). Reports to the tenant super_admin; the user form disables
  // the "Reporting To" picker for this role.
  BRANCH_MANAGER: 'branch_manager',
  SALES_MANAGER: 'sales_manager',
  COUNSELLOR: 'counsellor',
  // Tenant-level role for post-conversion account management. No team —
  // reports to their branch manager (or the tenant super_admin). Visibility
  // scope: every converted lead in the tenant (enforced server-side).
  ACCOUNT_MANAGER: 'account_manager',
  // ---- LMS / Trainer module ----
  // Owns a course (modules, trainer roster, batches) + teaches.
  HEAD_TRAINER: 'head_trainer',
  // Teaches assigned module(s) of a course.
  TRAINER: 'trainer',
  // Authenticated learner. NOTE: students authenticate via a separate
  // student JWT (type:'student'); this role value is what their /student-auth
  // session reports, used to gate the /student/* layout.
  STUDENT: 'student',
  // ---- Operations departments ----
  // HR: mock-interview soft-skill scoring + certificate issuance.
  HR: 'hr',
  // Placement: companies, job openings, applications, criteria firing.
  PLACEMENT: 'placement',
};

// Role → set of tabs the bucket can access (used for safety; final source is backend's allowed_tabs).
const ROLE_ALL_TABS = ['*'];
const ROLE_MANAGER_TABS = [
  'dashboard', 'leads', 'lead_pool', 'raw_data', 'failed_leads', 'bulk_upload', 'followups',
  'whatsapp', 'bulk_marketing', 'drip_marketing', 'automation',
  'connected_accounts',
  'settings.email_templates', 'settings.sms_templates', 'settings.whatsapp_templates',
  'settings.assignment_rules',
  'lead_transfer_report',
];
const ROLE_COUNSELLOR_TABS = [
  'dashboard', 'leads', 'lead_pool', 'raw_data', 'failed_leads', 'followups', 'whatsapp',
  'admissions.my_students',
];
// Account managers get a dedicated Accounts module — separate sidebar
// entirely from counsellors / managers. They never see /leadlist or
// /followupmanager (those are sales-team surfaces).
const ROLE_ACCOUNT_MANAGER_TABS = [
  'whatsapp', // accounts team gets full WhatsApp visibility (all conversations)
  'accounts.dashboard',
  'accounts.pending_admissions',
  'accounts.this_month_admissions',
  'accounts.total_admissions',
  'accounts.approvals',
  'accounts.attendings',
  'accounts.break',
  'accounts.report',
  'accounts.pay_schedule',
  'accounts.collection_receipt_wise',
  'accounts.payment_details',
];

// LMS trainer surfaces (head_trainer additionally gets courses.manage).
const ROLE_TRAINER_TABS = [
  'trainer.classes', 'trainer.attendance', 'trainer.recordings',
  'trainer.announcements', 'trainer.forum', 'trainer.tests',
  'trainer.projects', 'trainer.interviews', 'trainer.leaderboard',
  'trainer.materials',
];
const ROLE_HEAD_TRAINER_TABS = ['courses.manage', ...ROLE_TRAINER_TABS];
const ROLE_STUDENT_TABS = [
  'student.home', 'student.classes', 'student.forum', 'student.tests',
  'student.projects', 'student.leaderboard', 'student.catalog',
  'student.materials', 'student.certificate', 'student.jobs',
];
const ROLE_HR_TABS = ['hr.dashboard', 'hr.interviews', 'hr.certificates'];
const ROLE_PLACEMENT_TABS = ['placement.dashboard', 'placement.companies', 'placement.openings', 'placement.applications'];

const FALLBACK_TABS = {
  [ROLES.SUPER_ADMIN]: ROLE_ALL_TABS,
  // branch_manager is admin-like for tabs (backend sends ['*']); mirror that
  // in the fallback so the sidebar isn't starved if allowed_tabs is missing.
  [ROLES.BRANCH_MANAGER]: ROLE_ALL_TABS,
  [ROLES.SALES_MANAGER]: ROLE_MANAGER_TABS,
  [ROLES.COUNSELLOR]: ROLE_COUNSELLOR_TABS,
  [ROLES.ACCOUNT_MANAGER]: ROLE_ACCOUNT_MANAGER_TABS,
  [ROLES.HEAD_TRAINER]: ROLE_HEAD_TRAINER_TABS,
  [ROLES.TRAINER]: ROLE_TRAINER_TABS,
  [ROLES.STUDENT]: ROLE_STUDENT_TABS,
  [ROLES.HR]: ROLE_HR_TABS,
  [ROLES.PLACEMENT]: ROLE_PLACEMENT_TABS,
};

// ---------- Public helpers ----------
export const currentRole = () => auth.getUser()?.role || null;

export const isRole = (...roles) => roles.includes(currentRole());

// Check if the logged-in user has access to a tab key (matches DEFAULT_TAB_KEYS on backend).
//
// Two sources of truth, in order:
//   1. `allowed_tabs` from /auth/login or /auth/me — the explicit list the
//      backend computed from the user's role's tab_permissions. We trust it
//      whenever the backend has populated it (even if empty — an empty list
//      means "this user has had their tabs custom-restricted to nothing").
//   2. Role buckets — only used when the backend hasn't populated allowed_tabs
//      at all (legacy users without a custom role row).
//
// Previously this function fell back to the role bucket whenever
// `allowed_tabs` was an empty array, which silently undid an admin's "hide
// dashboard" choice for a counsellor with all tabs hidden.
export const hasTab = (tabKey) => {
  if (!tabKey) return true;
  const allowed = auth.getAllowedTabs();
  if (Array.isArray(allowed)) {
    // `'*'` is a wildcard the backend may return for super_admin. Honor
    // it so new tabs added to the codebase work without forcing a
    // re-seed of the role's stored tab_permissions JSON.
    return allowed.includes('*') || allowed.includes(tabKey);
  }
  // No allowed_tabs at all → fall back to the bucket for the role.
  const role = currentRole();
  const tabs = FALLBACK_TABS[role];
  if (!tabs) return false;
  return tabs.includes('*') || tabs.includes(tabKey);
};

// Map of tab key → the route the sidebar uses for it. When we need to
// redirect a user away from a forbidden route we use this to find a page
// they can actually access.
const TAB_TO_ROUTE = {
  dashboard: '/dashboard',
  leads: '/leadlist',
  lead_pool: '/lead-pool',
  // super_admin-only standalone payments ledger.
  payments: '/payments',
  raw_data: '/rawdata',
  failed_leads: '/failedleads',
  bulk_upload: '/bulkuploadlist',
  followups: '/followupmanager',
  whatsapp: '/whatsapplist',
  bulk_marketing: '/bulkmarketingcampaign',
  drip_marketing: '/dripmarketingcampaign',
  remarketing: '/remarketing',
  automation: '/automations',
  connected_accounts: '/connectedaccounts',
  third_party_integration: '/connectedaccounts',
  reports: '/dashboard',
  lead_transfer_report: '/reports/lead-transfers',
  // Accounts module — account_manager only
  'accounts.dashboard':              '/accounts/dashboard',
  'accounts.pending_admissions':     '/accounts/pending-admissions',
  'accounts.this_month_admissions':  '/accounts/this-month-admissions',
  'accounts.total_admissions':       '/accounts/total-admissions',
  'accounts.approvals':              '/accounts/approvals',
  'accounts.attendings':             '/accounts/attendings',
  'accounts.break':                  '/accounts/break',
  'accounts.report':                 '/accounts/report',
  'accounts.pay_schedule':           '/accounts/pay-schedule',
  'accounts.collection_receipt_wise':'/accounts/collection-receipt-wise',
  // Counsellor scoped admissions.
  'admissions.my_students':          '/my-students',
  // ---- LMS trainer surfaces (admin app, role-gated) ----
  'courses.manage':        '/trainer/courses',
  'trainer.classes':       '/trainer/classes',
  'trainer.attendance':    '/trainer/attendance',
  'trainer.recordings':    '/trainer/recordings',
  'trainer.announcements': '/trainer/announcements',
  'trainer.forum':         '/trainer/forum',
  'trainer.tests':         '/trainer/tests',
  'trainer.projects':      '/trainer/projects',
  'trainer.interviews':    '/trainer/interviews',
  'trainer.leaderboard':   '/trainer/leaderboard',
  'trainer.materials':     '/trainer/materials',
  'lms.analytics':         '/lms/analytics',
  // ---- HR department ----
  'hr.dashboard':          '/hr/dashboard',
  'hr.interviews':         '/hr/interviews',
  'hr.certificates':       '/hr/certificates',
  // ---- Placement department ----
  'placement.dashboard':   '/placement/dashboard',
  'placement.companies':   '/placement/companies',
  'placement.openings':    '/placement/openings',
  'placement.applications': '/placement/applications',
  // ---- Student panel (separate /student/* layout) ----
  'student.home':          '/student/home',
  'student.classes':       '/student/classes',
  'student.forum':         '/student/forum',
  'student.tests':         '/student/tests',
  'student.projects':      '/student/projects',
  'student.leaderboard':   '/student/leaderboard',
  'student.catalog':       '/student/catalog',
  'student.materials':     '/student/materials',
  'student.certificate':   '/student/certificate',
  'student.jobs':          '/student/jobs',
};

// First route the current user is allowed to land on. Used by login and
// "denied access" redirects so we never bounce a user to a page they
// don't have permission for.
export const firstAllowedRoute = () => {
  const allowed = auth.getAllowedTabs();
  // Empty / unset allowed_tabs: use the role bucket (back-compat).
  const candidates = (Array.isArray(allowed) && allowed.length)
    ? allowed
    : (FALLBACK_TABS[currentRole()] || []);

  // Walk the canonical sidebar order so the user lands on the most
  // dashboard-y thing they can access. Accounts-module keys are listed
  // first because account_managers have NO overlap with sales tabs —
  // their landing page is their own dashboard, not /leadlist.
  //
  // NOTE: students never use THIS (staff) login/route flow — they have their
  // own /student/login + studentApi session — so no student.* route ever
  // belongs here. And a wildcard ('*') admin must land on the CRM dashboard,
  // NOT a trainer surface: trainer homes are matched ONLY by an explicit tab
  // grant (a dedicated trainer/head_trainer user), never via '*'.
  const has = (key) => candidates.includes(key);              // explicit grant only
  const hasOrWild = (key) => candidates.includes('*') || has(key);

  // 1. A dedicated trainer/head_trainer (explicit trainer tab, no wildcard)
  //    lands on their own home.
  if (!candidates.includes('*')) {
    for (const key of ['courses.manage', 'trainer.classes', 'trainer.attendance', 'hr.dashboard', 'placement.dashboard']) {
      if (has(key)) return TAB_TO_ROUTE[key];
    }
  }

  // 2. Everyone else (incl. wildcard admins) → the most dashboard-y CRM/accounts
  //    surface they can access.
  const order = [
    'accounts.dashboard',
    'dashboard', 'leads', 'raw_data', 'failed_leads',
    'followups', 'whatsapp', 'bulk_upload',
    // trainer fallback for a wildcard admin who somehow has nothing above
    'lms.analytics',
  ];
  for (const key of order) {
    if (hasOrWild(key)) {
      const route = TAB_TO_ROUTE[key];
      if (route) return route;
    }
  }
  // Nothing matched — last resort the user is "logged in but has no
  // accessible page". Send them to the profile page (open to all roles)
  // so they aren't stuck on a blank screen.
  return '/profile';
};

// Render-prop / wrapper: <Gate tab="leads">...</Gate>  or  <Gate role="super_admin">...</Gate>
// Accepts: tab (string), role (string), anyRole (array), allRoles (array), fallback (node)
export const Gate = ({ tab, role, anyRole, allRoles, fallback = null, children }) => {
  if (tab && !hasTab(tab)) return fallback;
  if (role && !isRole(role)) return fallback;
  if (Array.isArray(anyRole) && !anyRole.some((r) => isRole(r))) return fallback;
  if (Array.isArray(allRoles) && !allRoles.every((r) => isRole(r))) return fallback;
  return children;
};
