// Domain-specific API helpers. Single source of truth for backend endpoint paths.
import { api, auth } from './api';

export const authApi = {
  login: ({ email, password, tenant_slug }) => api.post('/auth/login', { email, password, ...(tenant_slug ? { tenant_slug } : {}) }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  heartbeat: () => api.post('/auth/session/heartbeat'),
  changePassword: (body) => api.post('/auth/change-password', body),
};

export const leadsApi = {
  list: (params) => api.get('/leads', params),
  stageCounts: () => api.get('/leads/stage-counts'),
  get: (id) => api.get(`/leads/${id}`),
  timeline: (id, params) => api.get(`/leads/${id}/timeline`, params),
  create: (body) => api.post('/leads', body),
  update: (id, body, ifMatch) => api.put(`/leads/${id}`, body, ifMatch),
  delete: (id) => api.delete(`/leads/${id}`),
  changeStage: (id, body) => api.post(`/leads/${id}/stage`, body),
  bulkAssign: (body) => api.post('/leads/bulk-assign', body),
  reassign: (body) => api.post('/lead-assignments', body),
  // Run the active assignment rule against every unassigned lead in the tenant.
  // Returns { found, assigned, skipped }. Admin / sales-manager only at the API layer.
  autoAssignUnassigned: () => api.post('/leads/auto-assign-unassigned'),
};

export const followUpsApi = {
  list: (params) => api.get('/follow-ups', params),
  // Per-day counts for the FollowUp Manager calendar dots.
  calendar: (params) => api.get('/follow-ups/calendar', params),
  myUpcoming: () => api.get('/follow-ups/my'),
  overdue: () => api.get('/follow-ups/overdue'),
  create: (body) => api.post('/follow-ups', body),
  update: (id, body, ifMatch) => api.put(`/follow-ups/${id}`, body, ifMatch),
  complete: (id) => api.post(`/follow-ups/${id}/complete`),
  reschedule: (id, next_action_datetime) => api.post(`/follow-ups/${id}/reschedule`, { next_action_datetime }),
  delete: (id) => api.delete(`/follow-ups/${id}`),
};

export const analyticsApi = {
  summary: (params) => api.get('/analytics/summary', params),
  funnel: (params) => api.get('/analytics/funnel', params),
  leadsTimeline: (params) => api.get('/analytics/leads-timeline', params),
  programWise: (params) => api.get('/analytics/program-wise', params),
  channelSource: (params) => api.get('/analytics/channel-source', params),
  programStatus: (params) => api.get('/analytics/program-status', params),
  coldEnquiries: (params) => api.get('/analytics/cold-enquiries', params),
  counselorPerformance: (params) => api.get('/analytics/counselor-performance', params),
  communications: (params) => api.get('/analytics/communications', params),
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
  setPermissions: (id, permissions_json) => api.put(`/users/${id}/permissions`, { permissions_json }),
  // Per-user views used by the user-profile page.
  leads: (id, params) => api.get(`/users/${id}/leads`, params),
  workSessions: (id, params) => api.get(`/users/${id}/work-sessions`, params),
  loginEvents: (id, params) => api.get(`/users/${id}/login-events`, params),
  orgTree: () => api.get('/users/org-tree'),
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
  quota: () => api.get('/whatsapp/quota'),
  usage: () => api.get('/whatsapp/usage'),
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

export const bulkApi = {
  templateCsv: () => api.get('/bulk/leads/template'),
  templateFields: () => api.get('/bulk/leads/template/fields'),
  preview: (body) => api.post('/bulk/leads/preview', body),
  getPreview: (id) => api.get(`/bulk/leads/previews/${id}`),
  commit: (body) => api.post('/bulk/leads/commit', body),
  imports: () => api.get('/bulk/leads/imports'),
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
  retry: (id) => api.post(`/failed-leads/${id}/retry`),
  update: (id, body) => api.put(`/failed-leads/${id}`, body),
  delete: (id) => api.delete(`/failed-leads/${id}`),
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

export const notificationsApi = {
  list: (params) => api.get('/notifications', params),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
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

export { auth };
