// Singleton socket.io client + a tiny pub/sub for any component to subscribe
// to real-time `notification` events without each one opening its own connection.
import { io as ioClient } from 'socket.io-client';
import { auth } from './endpoints';

let socket = null;
const listeners = new Set();
let connectedAt = null;

// Socket.io attaches to the host root (path '/socket.io'), NOT under /api/v1.
// VITE_API_BASE_URL already includes /api/v1, so we strip it before passing
// the URL to the io() client. Falling back to localhost:4000 if not set.
const apiBase = () => {
  const fallback = 'http://localhost:4000';
  if (typeof window === 'undefined') return fallback;
  const env = (import.meta && import.meta.env) || {};
  const raw = env.VITE_API_BASE_URL || fallback;
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`; // drop pathname/search
  } catch {
    return raw.replace(/\/api\/v\d+\/?$/, '');
  }
};

export const connectSocket = () => {
  const token = auth.getAccess?.();
  if (!token) {
    // No token yet (user hasn't logged in). Caller can re-invoke after login.
    return null;
  }
  if (socket && socket.connected) return socket;
  if (socket) {
    // Re-use the existing instance but update the auth in case the token
    // refreshed since the last connect attempt.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  const url = apiBase();
  // eslint-disable-next-line no-console
  console.info('[socket] connecting to', url);
  socket = ioClient(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  socket.on('connect', () => {
    connectedAt = Date.now();
    // eslint-disable-next-line no-console
    console.info('[socket] connected', socket.id);
  });
  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[socket] connect_error:', err?.message);
  });
  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.info('[socket] disconnected:', reason);
  });
  socket.on('notification', (evt) => {
    for (const fn of listeners) {
      try { fn(evt); } catch { /* ignore */ }
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectedAt = null;
  }
};

export const onNotification = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const isSocketConnected = () => !!(socket && socket.connected);
