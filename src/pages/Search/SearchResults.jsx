// Global search results page. Reads ?q= from URL, hits /leads?q=…, lists hits.
// Clicking a result opens the AddNewLead dialog in edit mode (same flow as the
// lead-card name click) so users can act directly without an extra hop.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, IconButton, CircularProgress, Chip,
  List, ListItem, ListItemButton, ListItemText, Typography, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { leadsApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';
import { flagForLead, TONE_BG } from '../../lib/leadFlags';

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
  const [editLead, setEditLead] = useState(null);

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

  // Fetch on debounced query change
  useEffect(() => {
    const needle = (debouncedQ || '').trim();
    if (needle.length < 2) {
      setResults([]); setTotal(0); setError('');
      return;
    }
    setLoading(true); setError('');
    leadsApi.list({ q: needle, limit: 50 })
      .then((r) => {
        setResults(r?.data || []);
        setTotal(r?.meta?.total ?? 0);
      })
      .catch((e) => setError(e.message || 'Search failed'))
      .finally(() => setLoading(false));
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

      {grouped.map(([stage, rows]) => (
        <Box key={stage} sx={{ mb: 2, background: '#fff', border: '1px solid #eee', borderRadius: 1 }}>
          <Box sx={{ px: 2, py: 1.5, background: '#fdf3ed', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" label={stage} sx={{ height: 22, background: '#fff' }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              {rows.length} lead{rows.length === 1 ? '' : 's'}
            </Typography>
          </Box>
          <List disablePadding>
            {rows.map((r, i) => {
              const flag = flagForLead(r);
              return (
                <ListItem key={r.id} disablePadding divider={i < rows.length - 1}>
                  <ListItemButton onClick={() => setEditLead(r)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontWeight: 600 }}>{r.name || '—'}</span>
                          <span style={{ color: '#888', fontSize: 12 }}>
                            {[r.phone, r.email].filter(Boolean).join(' · ')}
                          </span>
                          {flag && (
                            <Chip
                              size="small"
                              label={flag.text}
                              sx={{ height: 18, fontSize: 10, background: TONE_BG[flag.tone] || TONE_BG.neutral, color: '#fff' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <span style={{ fontSize: 12, color: '#888' }}>
                          {[r.program_name, r.city, r.assigned_to_name && `Owner: ${r.assigned_to_name}`]
                            .filter(Boolean).join(' · ')}
                          {r.lead_score != null && ` · Score ${Number(r.lead_score).toFixed(0)}`}
                        </span>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}

      <AddNewLead
        open={!!editLead}
        leadData={editLead}
        onClose={() => setEditLead(null)}
        onSaved={() => { setEditLead(null); /* keep search list as-is */ }}
      />
    </Box>
  );
}
