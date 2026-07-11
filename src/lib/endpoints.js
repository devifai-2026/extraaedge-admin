// Domain-specific API helpers. Single source of truth for backend endpoint paths.
import { api, auth } from './api';

// Merge the super_admin's active branch (from the header branch switcher) into
// a query-params object, unless the caller already set branch_id. The backend
// only honors branch_id for super_admin; for other roles it's a no-op (they're
// branch-scoped server-side). Empty active branch = "All branches".
const withBranch = (params = {}) => {
  const branch = auth.getActiveBranch();
  if (!branch || params.branch_id) return params;
  return { ...params, branch_id: branch };
};

// The active branch id from the switcher, or null for "All branches". Used to
// stamp a new placement company/opening with the branch currently being viewed.
const activeBranchId = () => auth.getActiveBranch() || null;

// Unauthenticated student-facing admission flow. Reuses the regular `api`
// helper — the bearer token, if any, is harmless on these routes (the BE
// router doesn't run authRequired here). Used by /apply/:token.
export const publicAdmissionsApi = {
  prefill: (token) => api.get(`/public/admissions/${token}`),
  submit:  (token, body) => api.post(`/public/admissions/${token}/submit`, body),
  // Token-scoped photo upload: presign → direct PUT to GCS → confirm.
  uploadPresign: (token, body) => api.post(`/public/admissions/${token}/upload-presign`, body),
  uploadConfirm: (token, body) => api.post(`/public/admissions/${token}/upload-confirm`, body),
  signedUrl:     (token, r2_key) => api.get(`/public/admissions/${token}/signed-url`, { r2_key }),
};

// Public receipt by share-token. Same trust model as publicAdmissions:
// the token is the credential, no auth header needed.
export const publicReceiptsApi = {
  lookup: (token) => api.get(`/public/receipts/${token}`),
};

export const authApi = {
  login: ({ email, password, tenant_slug }) => api.post('/auth/login', { email, password, ...(tenant_slug ? { tenant_slug } : {}) }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  heartbeat: () => api.post('/auth/session/heartbeat'),
  changePassword: (body) => api.post('/auth/change-password', body),
};

export const leadsApi = {
  list: (params) => api.get('/leads', withBranch(params)),
  stageCounts: (params) => api.get('/leads/stage-counts', withBranch(params)),
  get: (id) => api.get(`/leads/${id}`),
  timeline: (id, params) => api.get(`/leads/${id}/timeline`, params),
  create: (body) => api.post('/leads', body),
  update: (id, body, ifMatch) => api.put(`/leads/${id}`, body, ifMatch),
  delete: (id) => api.delete(`/leads/${id}`),
  changeStage: (id, body) => api.post(`/leads/${id}/stage`, body),
  bulkAssign: (body) => api.post('/leads/bulk-assign', body),
  // Bulk hard-delete. Body: { ids: [uuid,...] }. Returns { deleted, deleted_ids }.
  // Super-admin only at the API layer — non-super-admin callers get 403.
  // The server CASCADEs every dependent row (followups, notes, activities,
  // assignments, family, attribution, custom values, tags, calls, payments,
  // referral edges) so the deletion is total.
  bulkDelete: (ids) => api.post('/leads/bulk-delete', { ids }),
  // Download the WHOLE filtered lead list as a CSV (no pagination — every
  // matching row in the tenant). Super-admin ONLY at the API layer (403 for
  // anyone else). Uses fetch directly (not the JSON `api` client) because the
  // body is a CSV file, and triggers a browser download. `params` is the same
  // filter object passed to leadsApi.list — minus page/limit, which the export
  // ignores. Returns the number of bytes saved (best-effort) for the caller.
  exportCsv: async (params = {}) => {
    const { auth, API_BASE } = await import('./api');
    const token = auth.getAccess();
    // Drop pagination params — the export is intentionally unpaginated.
    // Honor the active branch (super_admin branch switcher) like the list.
    const filters = withBranch({ ...(params || {}) });
    delete filters.page;
    delete filters.limit;
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    const url = `${API_BASE}/leads/export.csv${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = j?.error?.message || ''; } catch { /* not JSON */ }
      throw new Error(`Export failed (${res.status})${detail ? `: ${detail}` : ''}`);
    }
    const blob = await res.blob();
    // Prefer the server's filename from Content-Disposition; fall back to a
    // sensible default if the header isn't exposed.
    const cd = res.headers.get('content-disposition') || '';
    const match = /filename="?([^"]+)"?/.exec(cd);
    const filename = match ? match[1] : `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return blob.size;
  },
  reassign: (body) => api.post('/lead-assignments', body),
  // Valid reassign targets for the current actor — matches exactly what the
  // reassign POST will accept (managers+peers for a counsellor, team subtree
  // for a manager, all counsellors for admin). Use this to populate the picker.
  reassignTargets: () => api.get('/lead-assignments/targets'),
  // Run the active assignment rule against every unassigned lead in the tenant.
  // Returns { found, assigned, skipped }. Admin / sales-manager only at the API layer.
  autoAssignUnassigned: () => api.post('/leads/auto-assign-unassigned'),
  // Manually-uploaded call recordings on a lead. Stage / sub-stage are
  // snapshotted server-side from the lead's current stage at attach time.
  recordings: {
    list: (leadId) => api.get(`/leads/${leadId}/recordings`),
    create: (leadId, body) => api.post(`/leads/${leadId}/recordings`, body),
    playUrl: (leadId, recId) => api.get(`/leads/${leadId}/recordings/${recId}/url`),
    delete: (leadId, recId) => api.delete(`/leads/${leadId}/recordings/${recId}`),
  },
};

// Tenant-wide, READ-ONLY Lead Pool. Any counsellor (and up) can look up ANY
// lead in the tenant by name or phone (with or without a 91 prefix) — bypasses
// the owner/team/branch scope on /leads. Returns a read-only projection:
// lead details + current owner, manager, previous owner. No mutation surface.
export const leadPoolApi = {
  search: (params) => api.get('/lead-pool', params), // { q, limit? }
  get: (id) => api.get(`/lead-pool/${id}`),
};

// Call recordings uploaded from the mobile app. Counsellors see only their own
// (server-enforced); managers/admins see scope. Used by the Unmatched
// Recordings review tab.
export const deviceRecordingsApi = {
  list: (params) => api.get('/device-recordings', withBranch(params)),
  playUrl: (id) => api.get(`/device-recordings/${id}/url`),
  attach: (id, lead_id) => api.post(`/device-recordings/${id}/attach`, { lead_id }),
  delete: (id) => api.delete(`/device-recordings/${id}`),
};

export const followUpsApi = {
  list: (params) => api.get('/follow-ups', params),
  // Per-day counts for the FollowUp Manager calendar dots.
  calendar: (params) => api.get('/follow-ups/calendar', params),
  // Range analytics: status totals + per-lead breakdown.
  analytics: (params) => api.get('/follow-ups/analytics', params),
  myUpcoming: () => api.get('/follow-ups/my'),
  overdue: () => api.get('/follow-ups/overdue'),
  create: (body) => api.post('/follow-ups', body),
  update: (id, body, ifMatch) => api.put(`/follow-ups/${id}`, body, ifMatch),
  complete: (id, reason) => api.post(`/follow-ups/${id}/complete`, reason ? { completion_reason: reason } : {}),
  reschedule: (id, next_action_datetime) => api.post(`/follow-ups/${id}/reschedule`, { next_action_datetime }),
  // Cancel keeps the row (status='cancelled') so reports + timeline see it.
  // Use delete for hard-removal.
  cancel: (id, reason) => api.post(`/follow-ups/${id}/cancel`, reason ? { reason } : {}),
  delete: (id) => api.delete(`/follow-ups/${id}`),
};

export const analyticsApi = {
  summary: (params) => api.get('/analytics/summary', withBranch(params)),
  funnel: (params) => api.get('/analytics/funnel', withBranch(params)),
  leadsTimeline: (params) => api.get('/analytics/leads-timeline', withBranch(params)),
  programWise: (params) => api.get('/analytics/program-wise', withBranch(params)),
  channelSource: (params) => api.get('/analytics/channel-source', withBranch(params)),
  programStatus: (params) => api.get('/analytics/program-status', withBranch(params)),
  coldEnquiries: (params) => api.get('/analytics/cold-enquiries', withBranch(params)),
  counselorPerformance: (params) => api.get('/analytics/counselor-performance', withBranch(params)),
  communications: (params) => api.get('/analytics/communications', withBranch(params)),
  loginEvents: (params) => api.get('/analytics/login-events', params),
};

export const usersApi = {
  list: (params) => api.get('/users', params),
  myTeam: () => api.get('/users/team'),
  get: (id) => api.get(`/users/${id}`),
  create: (body) => api.post('/users', body),
  update: (id, body) => api.put(`/users/${id}`, body),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, new_password) => api.post(`/users/${id}/reset-password`, { new_password }),
  // Org-admin "Login as user". Returns the same payload as /auth/login.
  // The FE swaps it into auth.setSession(...) and reloads — the admin's
  // own session is gone in that browser tab from that point on.
  sudoLogin: (id) => api.post(`/users/${id}/sudo-login`),
  setPermissions: (id, permissions_json) => api.put(`/users/${id}/permissions`, { permissions_json }),
  // Per-user views used by the user-profile page.
  leads: (id, params) => api.get(`/users/${id}/leads`, params),
  workSessions: (id, params) => api.get(`/users/${id}/work-sessions`, params),
  loginEvents: (id, params) => api.get(`/users/${id}/login-events`, params),
  orgTree: () => api.get('/users/org-tree'),
  // Per-user UI theme (Profile → Theme). Body shape:
  //   { theme_preset, theme_primary, theme_primary_dark, theme_primary_light }
  // Any field can be null to reset that piece to system default.
  updateMyTheme: (body) => api.put('/users/me/theme', body),
  // Set / clear the current user's avatar. Pass { avatar_r2_key: null }
  // to clear. Returns { avatar_r2_key, avatar_url } where avatar_url is a
  // freshly-signed download URL the navbar can render immediately.
  updateMyAvatar: (body) => api.put('/users/me/avatar', body),
  // Self-service phone update (mandatory phone-capture popup). This number is
  // what the mobile call-recorder app must also use so uploads attribute to
  // this user. Rejects (409) a number already registered to another user once
  // platform-wide uniqueness is enforced.
  updateMyPhone: (phone) => api.put('/users/me/phone', { phone }),
  // OTP-verified phone RESET (Profile page). Send a WhatsApp OTP to the new
  // number, then confirm it with the received code to change the phone.
  sendPhoneOtp: (phone) => api.post('/users/me/phone/send-otp', { phone }),
  verifyPhoneOtp: (phone, code) => api.post('/users/me/phone/verify-otp', { phone, code }),
};

export const teamsApi = {
  list: () => api.get('/teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (body) => api.post('/teams', body),
  update: (id, body) => api.put(`/teams/${id}`, body),
  delete: (id) => api.delete(`/teams/${id}`),
  members: (id) => api.get(`/teams/${id}/members`),
  addMember: (id, body) => api.post(`/teams/${id}/members`, body),
  removeMember: (id, user_id) => api.delete(`/teams/${id}/members/${user_id}`),
};

export const leadDiscountsApi = {
  // Current discount on a lead (or null). Readable by counsellor/managers/
  // account_manager.
  get: (leadId) => api.get(`/lead-discounts/${leadId}`),
  // Apply / request a discount. <=10% self-applies for a counsellor; higher
  // routes to manager approval. Body: { discount_percent, reason? }.
  apply: (leadId, body) => api.post(`/lead-discounts/${leadId}`, body),
  // Manager approve/reject. Body: { decision: 'approved'|'rejected', reject_reason? }.
  decide: (leadId, body) => api.post(`/lead-discounts/${leadId}/decide`, body),
  // Pending-approval queue for the acting manager (team/branch-scoped server-side).
  pending: () => api.get('/lead-discounts/pending'),
};

export const branchesApi = {
  list: () => api.get('/branches'),
  get: (id) => api.get(`/branches/${id}`),
  create: (body) => api.post('/branches', body),
  update: (id, body) => api.put(`/branches/${id}`, body),
  remove: (id) => api.delete(`/branches/${id}`),
  // First-run onboarding: create the first branch AND move all existing users
  // + leads into it in one call. Body: { name, code?, branch_manager_id? }.
  // Returns { branch, users_adopted, leads_backfilled }.
  adoptAll: (body) => api.post('/branches/adopt-all', body),
  addMember: (id, user_id) => api.post(`/branches/${id}/members`, { user_id }),
  removeMember: (id, user_id) => api.delete(`/branches/${id}/members/${user_id}`),
};

export const customRolesApi = {
  list: () => api.get('/custom-roles'),
  get: (id) => api.get(`/custom-roles/${id}`),
  create: (body) => api.post('/custom-roles', body),
  update: (id, body) => api.put(`/custom-roles/${id}`, body),
  delete: (id) => api.delete(`/custom-roles/${id}`),
};

export const dropdownsApi = {
  list: (type) => api.get(`/dropdowns/${type}`),
  create: (type, body) => api.post(`/dropdowns/${type}`, body),
  update: (type, id, body) => api.put(`/dropdowns/${type}/${id}`, body),
  delete: (type, id) => api.delete(`/dropdowns/${type}/${id}`),
  reorder: (type, order) => api.post(`/dropdowns/${type}/reorder`, { order }),
  // Convenience getters
  stages: () => api.get('/dropdowns/stages'),
  subStages: () => api.get('/dropdowns/sub-stages'),
  channels: () => api.get('/dropdowns/channels'),
  sources: () => api.get('/dropdowns/sources'),
  campaigns: () => api.get('/dropdowns/campaigns'),
  mediums: () => api.get('/dropdowns/mediums'),
  primarySources: () => api.get('/dropdowns/primary-sources'),
  genders: () => api.get('/dropdowns/genders'),
};

// Quick-add lands the lead in the Unassigned bucket (no auto round-robin).
export const quickAddApi = {
  create: (body) => api.post('/quick-add', body),
};

export const programsApi = {
  list: () => api.get('/programs'),
  create: (body) => api.post('/programs', body),
  update: (id, body, ifMatch) => api.put(`/programs/${id}`, body, ifMatch),
  delete: (id) => api.delete(`/programs/${id}`),
};

export const tagsApi = {
  list: () => api.get('/tags'),
  create: (body) => api.post('/tags', body),
  update: (id, body) => api.put(`/tags/${id}`, body),
  delete: (id) => api.delete(`/tags/${id}`),
};

export const emailApi = {
  templates: {
    list: () => api.get('/email/templates'),
    get: (id) => api.get(`/email/templates/${id}`),
    create: (body) => api.post('/email/templates', body),
    update: (id, body) => api.put(`/email/templates/${id}`, body),
    delete: (id) => api.delete(`/email/templates/${id}`),
    duplicate: (id) => api.post(`/email/templates/${id}/duplicate`),
    toggle: (id) => api.post(`/email/templates/${id}/toggle`),
    variables: () => api.get('/email/templates/variables'),
  },
  send: (body) => api.post('/email/send', body),
  sendTest: (body) => api.post('/email/send/test', body),
  messages: (params) => api.get('/email/messages', params),
};

export const smsApi = {
  templates: {
    list: () => api.get('/sms/templates'),
    create: (body) => api.post('/sms/templates', body),
    update: (id, body) => api.put(`/sms/templates/${id}`, body),
    delete: (id) => api.delete(`/sms/templates/${id}`),
    toggle: (id) => api.post(`/sms/templates/${id}/toggle`),
  },
  send: (body) => api.post('/sms/send', body),
};

export const whatsappApi = {
  templates: {
    list: () => api.get('/whatsapp/templates'),
    create: (body) => api.post('/whatsapp/templates', body),
    update: (id, body) => api.put(`/whatsapp/templates/${id}`, body),
    delete: (id) => api.delete(`/whatsapp/templates/${id}`),
  },
  send: (body) => api.post('/whatsapp/send', body),
  inbox: (params) => api.get('/whatsapp/inbox', params),
  numbers: () => api.get('/whatsapp/numbers'),
  usage: () => api.get('/whatsapp/usage'),
  // Per-user personal-number WhatsApp (whatsapp-web.js gateway). Each user
  // links their own number; sends go out from it and replies route back to them.
  connection: {
    connect: () => api.post('/whatsapp/connection/connect'),
    status: () => api.get('/whatsapp/connection/status'),
    logout: () => api.post('/whatsapp/connection/logout'),
    conversations: () => api.get('/whatsapp/connection/conversations'),
    messages: (lead_id) => api.get('/whatsapp/connection/messages', { lead_id }),
    send: (body) => api.post('/whatsapp/connection/send', body), // { lead_id, body }
  },
};

export const integrationsApi = {
  list: () => api.get('/integrations'),
  get: (id) => api.get(`/integrations/${id}`),
  create: (body) => api.post('/integrations', body),
  update: (id, body) => api.put(`/integrations/${id}`, body),
  delete: (id) => api.delete(`/integrations/${id}`),
  toggle: (id) => api.post(`/integrations/${id}/toggle`),
  test: (id) => api.post(`/integrations/${id}/test`),
  getWebhookUrl: (id) => api.post(`/integrations/${id}/webhook-url`),
};

// Tenant self-branding (super_admin). updateLogo saves the uploaded logo's
// GCS key (or null to clear) onto the tenant; returns { logo_url, brand_name, ... }.
export const brandingApi = {
  update: (body) => api.put('/tenant-branding', body),
  updateLogo: (logo_r2_key) => api.put('/tenant-branding', { logo_r2_key }),
  // Fee-receipt config: { receipt_terms[], receipt_signatory_label,
  // receipt_no_prefix, receipt_no_start, receipt_no_pad } — same endpoint.
  updateReceiptSettings: (body) => api.put('/tenant-branding', body),
};

export const uploadsApi = {
  presign: (body) => api.post('/uploads/presign', body),
  confirm: (body) => api.post('/uploads/confirm', body),
  // Two flavours of signed-url:
  //   - signedUrlById:  GET /uploads/:id/signed-url    (id = uploaded_files.id UUID)
  //   - signedUrl:      GET /uploads/by-key/signed-url (r2_key querystring)
  // Most call sites (admission photos, recordings preview) only know the
  // r2_key, so signedUrl is the default. The legacy by-id form stays for
  // callers that already have the UUID handy.
  signedUrl: (r2Key) => api.get('/uploads/by-key/signed-url', { r2_key: r2Key }),
  signedUrlById: (id) => api.get(`/uploads/${id}/signed-url`),
};

export const bulkApi = {
  templateCsv: () => api.get('/bulk/leads/template'),
  templateFields: () => api.get('/bulk/leads/template/fields'),
  // Triggers a browser file download. Default is the .xlsx template; pass
  // `format: 'csv'` for the legacy CSV. Uses fetch directly (not the JSON
  // `api` client) because the body is binary.
  //
  // Validates the server's content-type before saving — otherwise a stale
  // server still on the old CSV-only route would silently save a CSV with
  // an .xlsx extension and Excel would refuse to open it.
  downloadTemplate: async ({ format = 'xlsx' } = {}) => {
    const { auth, API_BASE } = await import('./api');
    const token = auth.getAccess();
    const url = `${API_BASE}/bulk/leads/template${format === 'csv' ? '?format=csv' : ''}`;
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = j?.error?.message || ''; } catch { /* ignore */ }
      throw new Error(`Template download failed (${res.status})${detail ? `: ${detail}` : ''}`);
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const expectedMime = format === 'csv' ? 'text/csv' : 'spreadsheetml';
    if (!ct.includes(expectedMime)) {
      throw new Error(
        `Server returned ${ct || 'unknown content-type'} — expected ${format.toUpperCase()}. ` +
        `Restart the server (npm run dev) so the new template route is loaded.`,
      );
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `bulk-lead-template.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  },
  preview: (body) => api.post('/bulk/leads/preview', body),
  getPreview: (id) => api.get(`/bulk/leads/previews/${id}`),
  commit: (body) => api.post('/bulk/leads/commit', body),
  imports: (params) => api.get('/bulk/leads/imports', params),
  importsUploaders: () => api.get('/bulk/leads/imports/uploaders'),
  // Returns { url, file_name }. The url is a short-lived signed GCS URL —
  // hand it to the browser to download the original upload again.
  importFile: (id) => api.get(`/bulk/leads/imports/${id}/file`),
  import: (id) => api.get(`/bulk/leads/imports/${id}`),
  importFailures: (id) => api.get(`/bulk/leads/imports/${id}/failures`),
  retryFailures: (id) => api.post(`/bulk/leads/imports/${id}/retry-failures`),
  exportLeads: (body) => api.post('/bulk/leads/download', body),
  exports: () => api.get('/bulk/leads/exports'),
  bulkStatusChange: (body) => api.post('/bulk/leads/status-change', body),
  bulkRefer: (body) => api.post('/bulk/leads/refer', body),
};

export const campaignsBulkApi = {
  list: (params) => api.get('/campaigns/bulk', params),
  get: (id) => api.get(`/campaigns/bulk/${id}`),
  create: (body) => api.post('/campaigns/bulk', body),
  update: (id, body) => api.put(`/campaigns/bulk/${id}`, body),
  delete: (id) => api.delete(`/campaigns/bulk/${id}`),
  clone: (id) => api.post(`/campaigns/bulk/${id}/clone`),
  launch: (id) => api.post(`/campaigns/bulk/${id}/launch`),
  stop: (id) => api.post(`/campaigns/bulk/${id}/stop`),
  stats: (id) => api.get(`/campaigns/bulk/${id}/stats`),
  recipients: (id) => api.get(`/campaigns/bulk/${id}/recipients`),
  preview: (id) => api.post(`/campaigns/bulk/${id}/preview`),
};

export const campaignsDripApi = {
  list: () => api.get('/campaigns/drip'),
  get: (id) => api.get(`/campaigns/drip/${id}`),
  create: (body) => api.post('/campaigns/drip', body),
  update: (id, body) => api.put(`/campaigns/drip/${id}`, body),
  delete: (id) => api.delete(`/campaigns/drip/${id}`),
  toggle: (id) => api.post(`/campaigns/drip/${id}/toggle`),
  addRule: (id, body) => api.post(`/campaigns/drip/${id}/rules`, body),
  updateRule: (id, rid, body) => api.put(`/campaigns/drip/${id}/rules/${rid}`, body),
  deleteRule: (id, rid) => api.delete(`/campaigns/drip/${id}/rules/${rid}`),
  runs: (id) => api.get(`/campaigns/drip/${id}/runs`),
  stats: (id) => api.get(`/campaigns/drip/${id}/stats`),
};

export const assignmentRulesApi = {
  list: () => api.get('/assignment-rules'),
  create: (body) => api.post('/assignment-rules', body),
  update: (id, body) => api.put(`/assignment-rules/${id}`, body),
  delete: (id) => api.delete(`/assignment-rules/${id}`),
  test: (id, lead_id) => api.post(`/assignment-rules/${id}/test`, { lead_id }),
};

export const workflowsApi = {
  list: () => api.get('/workflows'),
  get: (id) => api.get(`/workflows/${id}`),
  create: (body) => api.post('/workflows', body),
  update: (id, body) => api.put(`/workflows/${id}`, body),
  delete: (id) => api.delete(`/workflows/${id}`),
  toggle: (id) => api.post(`/workflows/${id}/toggle`),
  execute: (id, body) => api.post(`/workflows/${id}/execute`, body),
  test: (id, lead_id) => api.post(`/workflows/${id}/test`, { lead_id }),
  runs: (id) => api.get(`/workflows/${id}/runs`),
  categories: () => api.get('/workflows/categories'),
};

export const rawDataApi = {
  list: (params) => api.get('/raw-data', params),
  promote: (id) => api.post(`/raw-data/${id}/promote`),
  verifyMobileStart: (id) => api.post(`/raw-data/${id}/verify-mobile`),
  verifyMobileConfirm: (id, body) => api.post(`/raw-data/${id}/verify-mobile/confirm`, body),
  verifyEmailStart: (id) => api.post(`/raw-data/${id}/verify-email`),
};

export const failedLeadsApi = {
  list: (params) => api.get('/failed-leads', params),
  update: (id, body) => api.put(`/failed-leads/${id}`, body),
  delete: (id) => api.delete(`/failed-leads/${id}`),
  // Bulk-delete validation failures. Body: { ids: [uuid, ...] } (max 500).
  // Returns { deleted, requested } — deleted may be less than requested
  // for non-admin viewers if some ids belonged to other users.
  bulkDelete: (ids) => api.post('/failed-leads/bulk-delete', { ids }),
  duplicates: (params) => api.get('/failed-leads/duplicates', params),
  deleteDuplicate: (id) => api.delete(`/failed-leads/duplicates/${id}`),
  bulkDeleteDuplicates: (ids) => api.post('/failed-leads/duplicates/bulk-delete', { ids }),
  summary: (params) => api.get('/failed-leads/summary', params),
};

export const outboundWebhooksApi = {
  list: () => api.get('/outbound-webhooks'),
  create: (body) => api.post('/outbound-webhooks', body),
  update: (id, body) => api.put(`/outbound-webhooks/${id}`, body),
  delete: (id) => api.delete(`/outbound-webhooks/${id}`),
  test: (id) => api.post(`/outbound-webhooks/${id}/test`),
  deliveries: (id) => api.get(`/outbound-webhooks/${id}/deliveries`),
  retryDelivery: (id) => api.post(`/outbound-webhooks/deliveries/${id}/retry`),
};

export const remarketingApi = {
  audiences: () => api.get('/remarketing/audiences'),
  createAudience: (body) => api.post('/remarketing/audiences', body),
  updateAudience: (id, body) => api.put(`/remarketing/audiences/${id}`, body),
  deleteAudience: (id) => api.delete(`/remarketing/audiences/${id}`),
  syncAudience: (id) => api.post(`/remarketing/audiences/${id}/sync`),
  accounts: () => api.get('/remarketing/accounts'),
};

export const leadScoreApi = {
  config: () => api.get('/lead-score/config'),
  updateConfig: (config) => api.put('/lead-score/config', config),
  test: (lead_id) => api.post('/lead-score/test', { lead_id }),
};

export const subscriptionApi = {
  current: () => api.get('/subscription'),
  usage: () => api.get('/subscription/usage'),
  recharge: (body) => api.post('/subscription/recharge', body),
  transactions: () => api.get('/subscription/transactions'),
  setPlan: (plan_id) => api.put('/subscription/plan', { plan_id }),
};

// Per-lead customised fee offer. The accounts team configures this
// before a public share-link can be generated; the public form binds
// to it so the student sees the agreed fees (read-only).
export const leadFeeOffersApi = {
  get:    (leadId) => api.get(`/lead-fee-offers/${leadId}`),
  upsert: (leadId, body) => api.put(`/lead-fee-offers/${leadId}`, body),
};

// Admin-managed payment destinations (bank accounts + UPI IDs) used to collect
// the registration / admission amount. super_admin only. Exactly one account
// is primary; the backend enforces that invariant.
export const paymentAccountsApi = {
  list:         (params) => api.get('/payment-accounts', params),
  get:          (id) => api.get(`/payment-accounts/${id}`),
  create:       (body) => api.post('/payment-accounts', body),
  update:       (id, body) => api.put(`/payment-accounts/${id}`, body),
  // Multiple primaries allowed; bulk mark/unmark. Body: { ids: [...] }.
  setPrimary:   (ids) => api.post('/payment-accounts/set-primary', { ids }),
  unsetPrimary: (ids) => api.post('/payment-accounts/unset-primary', { ids }),
  delete:       (id) => api.delete(`/payment-accounts/${id}`),
};

// Accounts / Admissions module. Only visible to account_manager + super_admin.
// All routes live under /api/v1/admissions.
export const admissionsApi = {
  // Dashboard summary cards + chart data. withBranch lets a super_admin scope to
  // the switcher's branch; a branch_manager is scoped to their branch server-side.
  dashboard: (params) => api.get('/admissions/dashboard', withBranch(params || {})),

  // Pending admissions queue (converted leads w/o admission + pending_approval)
  pendingAdmissions: () => api.get('/admissions/pending-admissions'),
  pendingAdmissionsCount: () => api.get('/admissions/pending-admissions/count'),
  // Tenant-wide admission pipeline snapshot: status counts + list of every
  // converted lead with their current admission state. Feeds the Admission
  // Pipeline sidebar page + the dashboard cards.
  leadStatusSnapshot: () => api.get('/admissions/lead-status-snapshot', withBranch()),
  // Append-only event log for one admission. Drives the timeline tab.
  timeline: (id) => api.get(`/admissions/${id}/timeline`),
  // Lead-drawer Admission Timeline tab uses this — resolves lead→admission
  // server-side and returns the events in one hop.
  timelineByLead: (leadId) => api.get(`/admissions/by-lead/${leadId}/timeline`),
  // Mint a fresh 24h public share-link for the student to fill the admission
  // form themselves. Returns { token, expires_at } — the FE turns that into
  // a full URL using window.location.origin.
  // Optional body { payment_account_id } binds the account the student
  // should pay into to the minted link.
  generateShareLink: (leadId, body) => api.post(`/admissions/share-link/${leadId}`, body || {}),

  // List + detail
  list: (params) => api.get('/admissions', params),
  get: (id) => api.get(`/admissions/${id}`),
  create: (body) => api.post('/admissions', body),
  update: (id, body) => api.put(`/admissions/${id}`, body),
  delete: (id) => api.delete(`/admissions/${id}`),

  // Status transitions
  approve: (id) => api.post(`/admissions/${id}/approve`),
  // Provision the student LMS portal after approval; returns { student,
  // set_password_url, emailed } so the UI can offer a copy-link fallback.
  confirmCourse: (id) => api.post(`/admissions/${id}/confirm-course`),
  reject: (id, reason) => api.post(`/admissions/${id}/reject`, reason ? { reason } : {}),
  emiDigest: (days = 7) => api.get(`/admissions/emi-digest`, withBranch({ days })),
  // Counsellor "My Students": their converted leads + submitted admissions.
  myStudents: () => api.get('/admissions/my-students'),
  break: (id, reason) => api.post(`/admissions/${id}/break`, reason ? { reason } : {}),
  resume: (id) => api.post(`/admissions/${id}/resume`),
  complete: (id) => api.post(`/admissions/${id}/complete`),
  // Drop a student (withdrew/won't continue). Stops reminders + moves them to
  // the Drop Candidates tab.
  drop: (id, reason) => api.post(`/admissions/${id}/drop`, reason ? { reason } : {}),

  // Receipts (per-admission CRUD + flat list)
  createReceipt: (admissionId, body) => api.post(`/admissions/${admissionId}/receipts`, body),
  listReceipts: (params) => api.get('/admissions/receipts', params),
  deleteReceipt: (id) => api.delete(`/admissions/receipts/${id}`),

  // Admin Payment Details ledger — paginated/filterable/sortable/searchable.
  // Returns { data: rows, meta: { total, total_amount, page, limit } }.
  paymentDetails: (params) => api.get('/admissions/payment-details', withBranch(params || {})),
  // Payment analytics for the admin dashboard charts (trend, by_mode, by_kind).
  paymentAnalytics: (params) => api.get('/admissions/payment-analytics', withBranch(params || {})),

  // Reports
  paySchedule: (params) => api.get('/admissions/reports/pay-schedule', params),
  collectionReceiptWise: (params) => api.get('/admissions/reports/collection-receipt-wise', params),

  // Centers (super_admin manages; account_manager reads via list)
  centers: {
    list: () => api.get('/admissions/centers'),
    create: (body) => api.post('/admissions/centers', body),
    update: (id, body) => api.put(`/admissions/centers/${id}`, body),
    delete: (id) => api.delete(`/admissions/centers/${id}`),
  },
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  // Hard-delete every notification row for the calling user.
  deleteAll: () => api.delete('/notifications'),
};

export const workSessionsApi = {
  current: () => api.get('/work-sessions/current'),
  start: () => api.post('/work-sessions/start'),
  pause: () => api.post('/work-sessions/pause'),
  resume: () => api.post('/work-sessions/resume'),
  stop: () => api.post('/work-sessions/stop'),
  // Manually open a brand-new session even after the user already stopped today.
  // The backend keeps the prior stopped row for audit and flags this one with restart_of_day=true.
  restartDay: () => api.post('/work-sessions/restart-day'),
  heartbeat: () => api.post('/work-sessions/heartbeat'),
  me: () => api.get('/work-sessions/me'),
  today: () => api.get('/work-sessions/me/today'),
  list: (params) => api.get('/work-sessions', params),
  teamSummary: () => api.get('/work-sessions/team-summary'),
};

export const customFieldsApi = {
  list: (params) => api.get('/custom-fields', params),
  create: (body) => api.post('/custom-fields', body),
  update: (id, body) => api.put(`/custom-fields/${id}`, body),
  delete: (id) => api.delete(`/custom-fields/${id}`),
  reorder: (order) => api.post('/custom-fields/reorder', { order }),
};

export const savedFiltersApi = {
  list: (params) => api.get('/saved-filters', params),
  create: (body) => api.post('/saved-filters', body),
  update: (id, body) => api.put(`/saved-filters/${id}`, body),
  delete: (id) => api.delete(`/saved-filters/${id}`),
};

export const leadNotesApi = {
  list: (leadId) => api.get(`/lead-notes/lead/${leadId}`),
  create: (leadId, body) => api.post(`/lead-notes/lead/${leadId}`, body),
  update: (id, body) => api.put(`/lead-notes/${id}`, body),
  delete: (id) => api.delete(`/lead-notes/${id}`),
};

export const reportsApi = {
  leadPdf: (id) => api.post(`/reports/leads/${id}/pdf`),
  dashboardPdf: (body) => api.post('/reports/dashboard/pdf', body),
  jobStatus: (job_id) => api.get(`/reports/${job_id}`),
  // Lead Transfer Report (admin + sales_manager). JSON for the on-screen table.
  leadTransfers: (params) => api.get('/reports/lead-transfers', params),
  // Streams the same report as an Excel file and triggers a browser download.
  downloadLeadTransfers: async (params = {}) => {
    const { auth, API_BASE } = await import('./api');
    const token = auth.getAccess();
    const qs = new URLSearchParams({ ...params, format: 'xlsx' }).toString();
    const res = await fetch(`${API_BASE}/reports/lead-transfers?${qs}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = j?.error?.message || ''; } catch { /* ignore */ }
      throw new Error(`Export failed (${res.status})${detail ? `: ${detail}` : ''}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `lead-transfers-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  },
};

export const ticketsApi = {
  me: () => api.get('/tickets/me'),
  contacts: () => api.get('/tickets/contacts'),
  list: () => api.get('/tickets'),
  get: (id) => api.get(`/tickets/${id}`),
  create: (body) => api.post('/tickets', body),
  updateStatus: (id, body) => api.patch(`/tickets/${id}`, body),
  comment: (id, body) => api.post(`/tickets/${id}/comments`, body),
};

// Trainer/admin view of a student's profile + CV (read-only).
export const studentProfileApi = {
  view: (studentId) => api.get(`/student-auth/students/${studentId}/profile`),
};

// ---- LMS: courses / modules / trainers / batches (trainer + head + admin) ----
export const coursesApi = {
  list: () => api.get('/courses'),
  get: (programId) => api.get(`/courses/${programId}`),
  assignableStaff: () => api.get('/courses/assignable-staff'),
  attendanceHistory: (programId) => api.get(`/courses/${programId}/attendance-history`, withBranch()),
  insights: () => api.get('/courses/insights', withBranch()),
  myBranches: () => api.get('/courses/my-branches'),
  createTrainer: (programId, body) => api.post(`/courses/${programId}/create-trainer`, body),
  completeBatch: (programId, batchId) => api.post(`/courses/${programId}/batches/${batchId}/complete`),
  students: () => api.get('/courses/students', withBranch()),
  resetStudentPassword: (studentId) => api.post(`/courses/students/${studentId}/reset-password`),
  sudoStudent: (studentId) => api.post(`/courses/students/${studentId}/sudo-login`),
  // Modules
  listModules: (programId) => api.get(`/courses/${programId}/modules`),
  createModule: (programId, body) => api.post(`/courses/${programId}/modules`, body),
  updateModule: (programId, moduleId, body) => api.put(`/courses/${programId}/modules/${moduleId}`, body),
  deleteModule: (programId, moduleId) => api.delete(`/courses/${programId}/modules/${moduleId}`),
  // Trainers
  listTrainers: (programId) => api.get(`/courses/${programId}/trainers`),
  addTrainer: (programId, body) => api.post(`/courses/${programId}/trainers`, body),
  removeTrainer: (programId, id) => api.delete(`/courses/${programId}/trainers/${id}`),
  // Batches
  listBatches: (programId) => api.get(`/courses/${programId}/batches`),
  createBatch: (programId, body) => api.post(`/courses/${programId}/batches`, body),
  listBatchStudents: (programId, batchId) => api.get(`/courses/${programId}/batches/${batchId}/students`),
  listUnassignedStudents: (programId) => api.get(`/courses/${programId}/unassigned-students`),
  placeStudent: (programId, body) => api.post(`/courses/${programId}/batches/place`, body),
  mergeBatches: (programId, body) => api.post(`/courses/${programId}/batches/merge`, body),
};

// ---- LMS: classes + live attendance (trainer) ----
export const classesApi = {
  list: (params) => api.get('/classes', params),
  create: (body) => api.post('/classes', body),
  update: (id, body) => api.put(`/classes/${id}`, body),
  remove: (id) => api.delete(`/classes/${id}`),
  lifecycle: (id, action) => api.post(`/classes/${id}/lifecycle`, { action }),
  // question bank (per module; programId as query for scope)
  listBank: (moduleId, programId) => api.get(`/classes/bank/${moduleId}`, { programId }),
  addBankQuestion: (moduleId, programId, body) => api.post(`/classes/bank/${moduleId}?programId=${programId}`, body),
  deleteBankQuestion: (id, programId) => api.delete(`/classes/bank-question/${id}?programId=${programId}`),
  // fire + attendance
  fireQuestion: (id, body) => api.post(`/classes/${id}/fire-question`, body),
  listQuestions: (id) => api.get(`/classes/${id}/questions`),
  attendance: (id) => api.get(`/classes/${id}/attendance`),
  editAttendance: (id, body) => api.post(`/classes/${id}/attendance/edit`, body),
};

// ---- LMS: recordings + announcements (trainer) ----
export const communityApi = {
  // recordings
  missedRecordings: () => api.get('/community/recordings/missed'),
  listRecordings: (classId) => api.get(`/community/classes/${classId}/recordings`),
  addRecording: (classId, body) => api.post(`/community/classes/${classId}/recordings`, body),
  recordingUrl: (id) => api.get(`/community/recordings/${id}/url`),
  // announcements
  listAnnouncements: (programId) => api.get('/community/announcements', { programId }),
  postAnnouncement: (body) => api.post('/community/announcements', body),
  listComments: (id) => api.get(`/community/announcements/${id}/comments`),
  comment: (id, body) => api.post(`/community/announcements/${id}/comments`, body),
  like: (id) => api.post(`/community/announcements/${id}/like`),
};

// ---- LMS: student doubt forum (trainer side) ----
export const forumApi = {
  listThreads: (programId) => api.get('/forum/threads', { programId }),
  replies: (id) => api.get(`/forum/threads/${id}/replies`),
  reply: (id, body) => api.post(`/forum/threads/${id}/replies`, body),
};

// ---- LMS: assessments (trainer) ----
export const assessmentsApi = {
  listTests: (programId) => api.get('/assessments/tests', { programId }),
  createTest: (body) => api.post('/assessments/tests', body),
  updateTest: (id, body) => api.patch(`/assessments/tests/${id}`, body),
  setTestPublished: (id, published) => api.post(`/assessments/tests/${id}/publish`, { published }),
  deleteTest: (id) => api.delete(`/assessments/tests/${id}`),
  testResults: (id) => api.get(`/assessments/tests/${id}/results`),
  listProjects: (programId) => api.get('/assessments/projects', { programId }),
  createProject: (body) => api.post('/assessments/projects', body),
  listSubmissions: (id) => api.get(`/assessments/projects/${id}/submissions`),
  grade: (id, body) => api.post(`/assessments/projects/${id}/grade`, body),
  leaderboard: (programId) => api.get('/assessments/leaderboard', { programId }),
};

// ---- LMS: mock interviews (trainer) ----
export const interviewsApi = {
  list: (programId) => api.get('/interviews', { programId }),
  students: (programId) => api.get('/interviews/students', { programId }),
  // Optionally scope the HR list to the interview's branch (F3).
  assignableHr: (interviewId) => api.get('/interviews/assignable-hr', interviewId ? { interview_id: interviewId } : undefined),
  create: (body) => api.post('/interviews', body),
  listSlots: (id) => api.get(`/interviews/${id}/slots`),
  assign: (id, body) => api.post(`/interviews/${id}/slots`, body),
  // Bulk-assign the same interview to many students, each a start/end window.
  assignBulk: (id, assignments) => api.post(`/interviews/${id}/slots/bulk`, { assignments }),
  assignHr: (id, body) => api.post(`/interviews/${id}/assign-hr`, body),
  grade: (slotId, body) => api.post(`/interviews/slots/${slotId}/grade`, body),
  score: (slotId, body) => api.post(`/interviews/slots/${slotId}/score`, body),
  hrQueue: () => api.get('/interviews/hr/queue'),
};

// ---- LMS: capstone (course-level project) — trainer/head/admin ----
export const capstoneApi = {
  list: (programId) => api.get('/capstone', { programId }),
  create: (body) => api.post('/capstone', body),
  remove: (id) => api.delete(`/capstone/${id}`),
  submissions: (id) => api.get(`/capstone/${id}/submissions`),
  grade: (id, body) => api.post(`/capstone/${id}/grade`, body),
};

// ---- Placement: companies, job openings, applications ----
export const placementApi = {
  counts: () => api.get('/placement/counts', withBranch()),
  programModules: (programId) => api.get(`/placement/programs/${programId}/modules`),
  // Companies (list/counts honor the active-branch switcher via withBranch).
  // Creates inherit the active branch so a company/opening made while viewing a
  // branch is stamped to it (backend still validates the actor may use it).
  listCompanies: () => api.get('/placement/companies', withBranch()),
  createCompany: (body) => api.post('/placement/companies', { branch_id: activeBranchId(), ...body }),
  bulkCompanies: (rows, branch_id) => api.post('/placement/companies/bulk', { rows, branch_id: branch_id || activeBranchId() || undefined }),
  updateCompany: (id, body) => api.put(`/placement/companies/${id}`, body),
  deleteCompany: (id) => api.delete(`/placement/companies/${id}`),
  // Openings
  listOpenings: (status) => api.get('/placement/openings', withBranch(status ? { status } : {})),
  createOpening: (body) => api.post('/placement/openings', { branch_id: activeBranchId(), ...body }),
  previewAudience: (id) => api.get(`/placement/openings/${id}/preview-audience`, withBranch()),
  fire: (id) => api.post(`/placement/openings/${id}/fire`, withBranch()),
  setOpeningStatus: (id, status) => api.post(`/placement/openings/${id}/status`, { status }),
  deleteOpening: (id) => api.delete(`/placement/openings/${id}`),
  // Applications
  applications: (id) => api.get(`/placement/openings/${id}/applications`),
  setApplicationStatus: (id, body) => api.post(`/placement/applications/${id}/status`, body),
};

// ---- LMS: admin analytics + student sudo-login (super_admin/branch_mgr) ----
export const lmsAnalyticsApi = {
  dashboard: () => api.get('/lms-analytics/dashboard', withBranch()),
  students: () => api.get('/lms-analytics/students', withBranch()),
  sudoStudent: (id) => api.post(`/lms-analytics/students/${id}/sudo-login`),
};

// ---- LMS: learning layer (materials, progress, certificates) — trainer/admin ----
export const learningApi = {
  moduleCompletion: (moduleId, programId) => api.get(`/learning/module/${moduleId}/completion`, { programId }),
  markModuleCompletion: (body) => api.post('/learning/module-completion', body),
  listMaterials: (programId) => api.get('/learning/materials', { programId }),
  createMaterial: (body) => api.post('/learning/materials', body),
  deleteMaterial: (id) => api.delete(`/learning/materials/${id}`),
  materialUrl: (id) => api.get(`/learning/materials/${id}/download`),
  progress: (programId) => api.get('/learning/progress', { programId }),
  listCertificates: (programId) => api.get('/learning/certificates', { programId }),
  issueCertificate: (body) => api.post('/learning/certificates/issue', body),
  hrCounts: () => api.get('/learning/hr/counts'),
  hrCertificates: (programId) => api.get('/learning/hr/certificates', { programId }),
  hrAutoIssue: (body) => api.post('/learning/hr/certificates/auto-issue', body),
};

export { auth };
