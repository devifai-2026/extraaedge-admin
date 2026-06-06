// Global search results page. Reads ?q= from URL, hits /leads?q=…, lists hits.
// Clicking a result opens the AddNewLead dialog in edit mode (same flow as the
// lead-card name click) so users can act directly without an extra hop.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, IconButton, CircularProgress, Chip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { leadsApi } from '../../lib/endpoints';
import LeadCard from '../../components/LeadCard/LeadCard';
import ReferLeadsDrawer from '../../components/ReferLeadsDrawer/ReferLeadsDrawer';

export default function SearchResults() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Reassign drawer state — the LeadCard's reassign icon + dropdown
  // delegate back to the parent via onReassign. We mount the same
  // ReferLeadsDrawer LeadList uses so the UX matches exactly.
  const [referLead, setReferLead] = useState(null);

  // Sync debounced value + URL
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      const next = new URLSearchParams(params);
      if (q) next.set('q', q); else next.delete('q');
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Fetch on debounced query change. `cancelled` guards against an older
  // in-flight request resolving after a newer one — that race was part of
  // the "search sometimes shows results, sometimes doesn't" symptom.
  useEffect(() => {
    const needle = (debouncedQ || '').trim();
    if (needle.length < 2) {
      setResults([]); setTotal(0); setError('');
      return;
    }
    let cancelled = false;
    setLoading(true); setError('');
    leadsApi.list({ q: needle, limit: 50 })
      .then((r) => {
        if (cancelled) return;
        setResults(r?.data || []);
        setTotal(r?.meta?.total ?? 0);
      })
      .catch((e) => { if (!cancelled) setError(e.message || 'Search failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQ]);

  const grouped = useMemo(() => {
    // Group hits by stage so users can see "5 in Followup, 2 in New, …".
    const map = new Map();
    for (const r of results) {
      const key = r.stage_name || 'No Stage';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} title="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          Search results
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          autoFocus
          size="medium"
          placeholder="Search by name, email, phone or WhatsApp number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment>
            ) : null,
          }}
        />
        <Typography variant="caption" sx={{ color: '#888', mt: 1, display: 'block' }}>
          {debouncedQ.trim().length < 2
            ? 'Type at least 2 characters to search'
            : `${total} match${total === 1 ? '' : 'es'} for "${debouncedQ}"`}
        </Typography>
      </Box>

      {error && (
        <Box sx={{ p: 2, color: '#d32f2f', background: '#fff5f5', border: '1px solid #ffd9d9', borderRadius: 1 }}>{error}</Box>
      )}

      {!loading && !error && debouncedQ.trim().length >= 2 && results.length === 0 && (
        <Box sx={{ textAlign: 'center', color: '#888', p: 4, background: '#fff', border: '1px solid #eee', borderRadius: 1 }}>
          No leads matched.
        </Box>
      )}

      {/* Render each search hit as a full LeadCard — same component the
          Lead Manager uses. Users get the exact same affordances they
          already know from /leadlist: name click → edit form, "View all"
          / stat icons → timeline, plus the call / whatsapp / email
          action icons on the right of each card. */}
      {grouped.map(([stage, rows]) => (
        <Box key={stage} sx={{ mb: 2 }}>
          <Box sx={{ px: 1, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" label={stage} sx={{ height: 22, background: '#fff', border: '1px solid #e5e7eb' }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              {rows.length} lead{rows.length === 1 ? '' : 's'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rows.map((r) => (
              <LeadCard
                key={r.id}
                lead={r}
                onReassign={() => setReferLead(r)}
                // Reload current results when a card mutates the lead —
                // simplest "refresh" is to re-fire the same debounced
                // search by bumping debouncedQ via setQ (no-op text
                // change). Skip it for now: keep the list as-is so
                // pagination / ordering doesn't shift under the user.
                onChanged={() => { /* no-op */ }}
              />
            ))}
          </Box>
        </Box>
      ))}

      {/* Reassign drawer — single-lead mode. Mirrors the wiring in
          LeadList so the Reassign icon + dropdown entry on each
          search-result card open the same drawer the rest of the app
          uses. */}
      <ReferLeadsDrawer
        open={!!referLead}
        onClose={() => setReferLead(null)}
        mode="single"
        lead={referLead}
        selectedIds={[]}
        filterParams={{}}
        totalInFilter={0}
        onDone={() => setReferLead(null)}
      />
    </Box>
  );
}
