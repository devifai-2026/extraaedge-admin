// Student API client + session — deliberately SEPARATE from the staff `api`
// (src/lib/api.js) and its `ee_*` storage keys, so a student session can never
// be confused with a staff one. Student requests carry the student JWT +
// x-tenant-slug (the student token is not a staff access token, so the staff
// tenant-from-JWT path doesn't apply on unauthenticated routes).
import { API_BASE } from './api';

const S = {
  TOKEN: 'ee_student_token',
  STUDENT: 'ee_student',
  TENANT_SLUG: 'ee_student_tenant',
  TENANT: 'ee_student_tenant_branding',
};

export const studentAuth = {
  getToken: () => localStorage.getItem(S.TOKEN),
  getTenantSlug: () => localStorage.getItem(S.TENANT_SLUG) || '',
  getStudent: () => {
    try { return JSON.parse(localStorage.getItem(S.STUDENT) || 'null'); } catch { return null; }
  },
  getTenant: () => {
    try { return JSON.parse(localStorage.getItem(S.TENANT) || 'null'); } catch { return null; }
  },
  setTenant: (t) => { if (t) localStorage.setItem(S.TENANT, JSON.stringify(t)); },
  isAuthed: () => !!localStorage.getItem(S.TOKEN),
  setSession: ({ access_token, student, tenantSlug }) => {
    if (access_token) localStorage.setItem(S.TOKEN, access_token);
    if (student) localStorage.setItem(S.STUDENT, JSON.stringify(student));
    if (tenantSlug) localStorage.setItem(S.TENANT_SLUG, tenantSlug);
  },
  clear: () => Object.values(S).forEach((k) => localStorage.removeItem(k)),
};

class StudentApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

const doFetch = async (path, init = {}) => {
  const headers = { ...(init.headers || {}) };
  if (!(init.body instanceof FormData)) headers['content-type'] ??= 'application/json';
  const token = studentAuth.getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  // The student token isn't a staff access token, so the backend can't derive
  // the tenant from it on unauthenticated routes — always send the slug.
  const slug = studentAuth.getTenantSlug();
  if (slug) headers['x-tenant-slug'] = slug;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    studentAuth.clear();
    if (typeof window !== 'undefined' && !path.includes('/login')) window.location.href = '/student/login';
  }
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText || 'Request failed';
    throw new StudentApiError(msg, res.status, data);
  }
  return data;
};

// The slug for login/set-password comes from the caller (login form / the ?t=
// param on the set-password link), not from a stored session yet.
const withSlug = (slug, headers = {}) => (slug ? { ...headers, 'x-tenant-slug': slug } : headers);

export const studentApi = {
  get: (path) => doFetch(path, { method: 'GET' }),
  post: (path, body) => doFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  // Auth calls that must set the tenant slug explicitly (no session yet).
  login: (slug, body) => doFetch('/student-auth/login', { method: 'POST', body: JSON.stringify(body), headers: withSlug(slug) }),
  setPassword: (slug, body) => doFetch('/student-auth/set-password', { method: 'POST', body: JSON.stringify(body), headers: withSlug(slug) }),
  requestReset: (slug, body) => doFetch('/student-auth/request-reset', { method: 'POST', body: JSON.stringify(body), headers: withSlug(slug) }),
  me: () => doFetch('/student-auth/me', { method: 'GET' }),
  // LMS student self-views.
  myCourse: () => doFetch('/courses/my-course', { method: 'GET' }),
  dashboard: () => doFetch('/courses/my-dashboard', { method: 'GET' }),
  myClasses: () => doFetch('/classes/student/my/classes', { method: 'GET' }),
  openQuestions: (classId) => doFetch(`/classes/student/${classId}/open-questions`, { method: 'GET' }),
  answer: (classId, body) => doFetch(`/classes/student/${classId}/answer`, { method: 'POST', body: JSON.stringify(body) }),
  preNotifyAbsence: (classId, reason) => doFetch(`/classes/student/${classId}/pre-notify-absence`, { method: 'POST', body: JSON.stringify({ reason: reason || undefined }) }),
  setJoinMode: (classId, join_mode, reason) => doFetch(`/classes/student/${classId}/join-mode`, { method: 'POST', body: JSON.stringify({ join_mode, reason: reason || undefined }) }),
  // Recordings + announcements.
  recordings: () => doFetch('/community/student/recordings', { method: 'GET' }),
  recordingUrl: (id) => doFetch(`/community/student/recordings/${id}/url`, { method: 'GET' }),
  announcements: () => doFetch('/community/student/announcements', { method: 'GET' }),
  announcementComments: (id) => doFetch(`/community/student/announcements/${id}/comments`, { method: 'GET' }),
  announcementComment: (id, body) => doFetch(`/community/student/announcements/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  announcementLike: (id) => doFetch(`/community/student/announcements/${id}/like`, { method: 'POST', body: '{}' }),
  // Forum.
  forumTrainers: () => doFetch('/forum/student/trainers', { method: 'GET' }),
  forumThreads: () => doFetch('/forum/student/threads', { method: 'GET' }),
  forumCreate: (body) => doFetch('/forum/student/threads', { method: 'POST', body: JSON.stringify(body) }),
  forumReplies: (id) => doFetch(`/forum/student/threads/${id}/replies`, { method: 'GET' }),
  forumReply: (id, body) => doFetch(`/forum/student/threads/${id}/replies`, { method: 'POST', body: JSON.stringify(body) }),
  // Assessments.
  tests: () => doFetch('/assessments/student/tests', { method: 'GET' }),
  takeTest: (id) => doFetch(`/assessments/student/tests/${id}`, { method: 'GET' }),
  submitTest: (id, answers) => doFetch(`/assessments/student/tests/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  projects: () => doFetch('/assessments/student/projects', { method: 'GET' }),
  submitProject: (id, body) => doFetch(`/assessments/student/projects/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  leaderboard: () => doFetch('/assessments/student/leaderboard', { method: 'GET' }),
  // Mock interviews.
  interviewSlots: () => doFetch('/interviews/student/slots', { method: 'GET' }),
  // Course catalog + enquiry.
  catalog: () => doFetch('/catalog', { method: 'GET' }),
  enquire: (programId) => doFetch(`/catalog/${programId}/enquire`, { method: 'POST', body: '{}' }),
  // Notifications.
  notifications: (unread) => doFetch(`/student-notifications${unread ? '?unread=true' : ''}`, { method: 'GET' }),
  markNotifRead: (id) => doFetch(`/student-notifications/${id}/read`, { method: 'POST', body: '{}' }),
  markAllNotifRead: () => doFetch('/student-notifications/read-all', { method: 'POST', body: '{}' }),
  // Profile.
  getProfile: () => doFetch('/student-auth/profile', { method: 'GET' }),
  updateProfile: (body) => doFetch('/student-auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  profilePresign: (body) => doFetch('/student-auth/profile/presign', { method: 'POST', body: JSON.stringify(body) }),
  setCv: (body) => doFetch('/student-auth/profile/cv', { method: 'POST', body: JSON.stringify(body) }),
  // Learning layer.
  materials: () => doFetch('/learning/student/materials', { method: 'GET' }),
  materialUrl: (id) => doFetch(`/learning/student/materials/${id}/download`, { method: 'GET' }),
  progress: () => doFetch('/learning/student/progress', { method: 'GET' }), // read-only; trainers certify completion
  certificate: () => doFetch('/learning/student/certificate', { method: 'GET' }),
  claimCertificate: () => doFetch('/learning/student/certificate/claim', { method: 'POST', body: '{}' }),
  homeExtras: () => doFetch('/learning/student/home-extras', { method: 'POST', body: '{}' }),
  // Capstone.
  capstones: () => doFetch('/capstone/student', { method: 'GET' }),
  submitCapstone: (id, body) => doFetch(`/capstone/student/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  // Profile presign is reused for capstone file uploads (kind handled server-side).
};

export { StudentApiError };
