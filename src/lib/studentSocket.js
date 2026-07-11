// Student portal socket client — mirrors lib/socket.js but authenticates with
// the STUDENT token (studentAuth), so the live-attendance popup, announcements
// and notifications reach a logged-in student in real time. The socket SERVER
// already supports type:'student' principals (studentRoom + lms:join-batch).
import { io as ioClient } from 'socket.io-client';
import { studentAuth } from './studentApi';
import { SERVER_HOST } from './config';

let socket = null;
const joined = new Set();

const apiBase = () => {
  const fallback = SERVER_HOST;
  if (typeof window === 'undefined') return fallback;
  const env = (import.meta && import.meta.env) || {};
  const raw = env.VITE_API_BASE_URL || fallback;
  try { const u = new URL(raw); return `${u.protocol}//${u.host}`; }
  catch { return raw.replace(/\/api\/v\d+\/?$/, ''); }
};

export const connectStudentSocket = () => {
  const token = studentAuth.getToken?.();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.auth = { token }; if (!socket.connected) socket.connect(); return socket; }

  socket = ioClient(apiBase(), {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
  // Re-join any batch rooms after a reconnect (rooms are per-connection).
  socket.on('connect', () => { joined.forEach((b) => socket.emit('lms:join-batch', b)); });
  return socket;
};

export const disconnectStudentSocket = () => {
  if (socket) { socket.disconnect(); socket = null; joined.clear(); }
};

export const joinStudentBatch = (batchId) => {
  if (!batchId) return;
  const s = socket || connectStudentSocket();
  joined.add(batchId);
  if (s) s.emit('lms:join-batch', batchId);
};

// Subscribe to a named socket event; returns an unsubscribe fn.
export const onStudentSocketEvent = (event, fn) => {
  const s = socket || connectStudentSocket();
  if (!s) return () => {};
  s.on(event, fn);
  return () => s.off(event, fn);
};
