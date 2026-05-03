// Shared API client for the tenant frontend.
// Reads VITE_API_BASE_URL, attaches JWT, refreshes once on 401, surfaces clean errors.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const STORAGE = {
  ACCESS: 'ee_access_token',
  REFRESH: 'ee_refresh_token',
  USER: 'ee_user',
  TENANT: 'ee_tenant',
  ALLOWED_TABS: 'ee_allowed_tabs',
};

export const auth = {
  getAccess: () => localStorage.getItem(STORAGE.ACCESS),
  getRefresh: () => localStorage.getItem(STORAGE.REFRESH),
  getUser: () => {
    const raw = localStorage.getItem(STORAGE.USER);
    return raw ? JSON.parse(raw) : null;
  },
  getTenant: () => {
    const raw = localStorage.getItem(STORAGE.TENANT);
    return raw ? JSON.parse(raw) : null;
  },
  getAllowedTabs: () => {
    const raw = localStorage.getItem(STORAGE.ALLOWED_TABS);
    return raw ? JSON.parse(raw) : [];
  },
  setSession: ({ access_token, refresh_token, user, tenant, allowed_tabs }) => {
    if (access_token) localStorage.setItem(STORAGE.ACCESS, access_token);
    if (refresh_token) localStorage.setItem(STORAGE.REFRESH, refresh_token);
    if (user) localStorage.setItem(STORAGE.USER, JSON.stringify(user));
    if (tenant) localStorage.setItem(STORAGE.TENANT, JSON.stringify(tenant));
    if (allowed_tabs) localStorage.setItem(STORAGE.ALLOWED_TABS, JSON.stringify(allowed_tabs));
  },
  clear: () => {
    Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
  },
  isAuthed: () => !!localStorage.getItem(STORAGE.ACCESS),
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshInFlight = null;

const tryRefresh = async () => {
  if (refreshInFlight) return refreshInFlight;
  const refresh_token = auth.getRefresh();
  if (!refresh_token) return null;
  refreshInFlight = (async () => {
    try {
      const res = await fetchWithRetry(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const payload = json?.data ?? json;
      auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      return payload.access_token ?? null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Network-level fetch failures (server restarting, transient drop) throw a
// generic TypeError("Failed to fetch") with no status. Retry the request a
// couple of times with a short backoff before surfacing the error — this
// hides the brief gap when nodemon swaps the dev server. If every attempt
// still fails, the page is in an unrecoverable state from this user's
// perspective: force a full reload so they land on a fresh boot instead of
// staring at a stale UI under a red error banner.
let reloadingForNetworkError = false;
const forceReload = () => {
  if (reloadingForNetworkError) return;
  reloadingForNetworkError = true;
  if (typeof window !== 'undefined') window.location.reload();
};

const fetchWithRetry = async (url, init, attempts = 3) => {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      // Only retry the network-layer TypeError. Aborts and HTTP errors do
      // not land here. Don't retry idempotency-unsafe verbs blindly: GET is
      // safe; everything else only retries if it never hit the server, which
      // is exactly what TypeError("Failed to fetch") means.
      if (!(err instanceof TypeError)) throw err;
      if (i < attempts - 1) await sleep(300 * (i + 1));
    }
  }
  forceReload();
  throw lastErr;
};

const doFetch = async (path, init = {}, retried = false) => {
  const headers = { ...(init.headers || {}) };
  if (!(init.body instanceof FormData)) headers['content-type'] ??= 'application/json';
  const token = auth.getAccess();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetchWithRetry(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && !retried && auth.getRefresh()) {
    const newToken = await tryRefresh();
    if (newToken) return doFetch(path, init, true);
    auth.clear();
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new ApiError('Session expired', 401);
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    // For validation errors the server sends `error.details: [{path, message}]`.
    // The bare "Validation failed" top-level message isn't useful — expand the
    // first ~3 details into a single string so the UI shows what's actually wrong.
    const baseMsg = data?.error?.message || data?.message || res.statusText || 'Request failed';
    const details = data?.error?.details;
    let msg = baseMsg;
    if (Array.isArray(details) && details.length > 0) {
      const lines = details.slice(0, 3).map((d) => {
        const path = Array.isArray(d?.path) ? d.path.join('.') : (d?.path || '');
        const m = d?.message || 'Invalid value';
        return path ? `${path}: ${m}` : m;
      });
      const more = details.length > 3 ? ` (+${details.length - 3} more)` : '';
      msg = `${baseMsg} — ${lines.join('; ')}${more}`;
    }
    throw new ApiError(msg, res.status, data);
  }
  return data;
};

export const api = {
  get: (path, params) => {
    const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : '';
    return doFetch(`${path}${qs}`, { method: 'GET' });
  },
  post: (path, body) => doFetch(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: (path, body, ifMatch) => doFetch(path, {
    method: 'PUT',
    headers: ifMatch ? { 'if-match': ifMatch } : {},
    body: JSON.stringify(body ?? {}),
  }),
  patch: (path, body, ifMatch) => doFetch(path, {
    method: 'PATCH',
    headers: ifMatch ? { 'if-match': ifMatch } : {},
    body: JSON.stringify(body ?? {}),
  }),
  delete: (path) => doFetch(path, { method: 'DELETE' }),
};

export { ApiError, API_BASE };
