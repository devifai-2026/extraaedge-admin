import { auditLogApi } from '../../lib/endpoints';

// Throttles identical (action, entity_id) events so a held-down key, a
// window that keeps losing focus, or the devtools heuristic re-firing every
// poll can't flood audit_log with duplicates. One real log line per action
// per entity every THROTTLE_MS is plenty for the "who's doing this" review.
const THROTTLE_MS = 5000;
const lastSentAt = new Map();

export const logSecurityEvent = (action, { entityId, entityType = 'lead' } = {}) => {
  const key = `${action}:${entityId || ''}`;
  const now = Date.now();
  if (now - (lastSentAt.get(key) || 0) < THROTTLE_MS) return;
  lastSentAt.set(key, now);
  auditLogApi.logEvent(action, { entity_id: entityId, entity_type: entityType }).catch(() => {
    // Never let a logging failure surface to the user — this is a
    // best-effort trail, not a feature the app depends on.
  });
};
