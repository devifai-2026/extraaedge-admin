// Shared hook for loading dropdown lists from /dropdowns/<type>.
// Caches results per-type within a single page load so opening a dialog twice
// doesn't re-hit the API. Custom-fields entry (entity=lead) is handled separately.
//
// Also exposes a `refreshDropdown(type)` that bumps a version counter, which
// any mounted `useDropdown(type)` listens to and re-fetches on. This is what
// the "+ Create new …" inline-create flow uses to surface a freshly-added
// option without forcing a full page reload.
import { useEffect, useState } from 'react';
import { dropdownsApi, programsApi, customFieldsApi } from './endpoints';

const cache = new Map();
const listeners = new Map(); // type → Set<fn(version)>
const versions = new Map();  // type → number

const fetcherFor = (type) => {
  if (type === 'programs') return () => programsApi.list();
  if (type === 'custom-fields') return () => customFieldsApi.list({ entity: 'lead' });
  return () => dropdownsApi.list(type);
};

const subscribe = (type, fn) => {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type)?.delete(fn);
};

export const useDropdown = (type, { enabled = true } = {}) => {
  const [data, setData] = useState(cache.get(type) ?? []);
  const [loading, setLoading] = useState(!cache.has(type));
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(versions.get(type) ?? 0);

  useEffect(() => {
    if (!type) return undefined;
    return subscribe(type, (v) => setVersion(v));
  }, [type]);

  useEffect(() => {
    if (!enabled || !type) return;
    if (cache.has(type)) {
      setData(cache.get(type));
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetcherFor(type)()
      .then((r) => {
        const rows = r?.data || [];
        cache.set(type, rows);
        if (!alive) return;
        setData(rows);
      })
      .catch((e) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [type, enabled, version]);

  return { data, loading, error };
};

// Drop the cached list and notify mounted hooks; they'll re-fetch on the next
// effect tick. Used after inline-create flows.
export const refreshDropdown = (type) => {
  cache.delete(type);
  const v = (versions.get(type) ?? 0) + 1;
  versions.set(type, v);
  listeners.get(type)?.forEach((fn) => fn(v));
};

// Back-compat aliases — same behaviour as refreshDropdown.
export const invalidateDropdown = refreshDropdown;
export const invalidateAllDropdowns = () => {
  for (const t of cache.keys()) refreshDropdown(t);
};
