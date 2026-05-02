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
  SALES_MANAGER: 'sales_manager',
  COUNSELLOR: 'counsellor',
};

// Role → set of tabs the bucket can access (used for safety; final source is backend's allowed_tabs).
const ROLE_ALL_TABS = ['*'];
const ROLE_MANAGER_TABS = [
  'dashboard', 'leads', 'raw_data', 'failed_leads', 'bulk_upload', 'followups',
  'whatsapp', 'bulk_marketing', 'drip_marketing', 'automation',
  'connected_accounts',
  'settings.email_templates', 'settings.sms_templates', 'settings.whatsapp_templates',
  'settings.assignment_rules',
];
const ROLE_COUNSELLOR_TABS = [
  'dashboard', 'leads', 'raw_data', 'failed_leads', 'followups', 'whatsapp',
];

const FALLBACK_TABS = {
  [ROLES.SUPER_ADMIN]: ROLE_ALL_TABS,
  [ROLES.SALES_MANAGER]: ROLE_MANAGER_TABS,
  [ROLES.COUNSELLOR]: ROLE_COUNSELLOR_TABS,
};

// ---------- Public helpers ----------
export const currentRole = () => auth.getUser()?.role || null;

export const isRole = (...roles) => roles.includes(currentRole());

// Check if the logged-in user has access to a tab key (matches DEFAULT_TAB_KEYS on backend).
export const hasTab = (tabKey) => {
  if (!tabKey) return true;
  const allowed = auth.getAllowedTabs();
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed.includes(tabKey);
  }
  // Backend didn't send allowed_tabs (custom-roles not configured). Fall back to role buckets.
  const role = currentRole();
  const tabs = FALLBACK_TABS[role];
  if (!tabs) return false;
  return tabs.includes('*') || tabs.includes(tabKey);
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
