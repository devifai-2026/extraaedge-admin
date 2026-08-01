// QA Feedback report — what admins / branch managers / sales managers read.
//
// Two halves: a per-counsellor scoreboard (how many calls reviewed, average
// score, average per rubric parameter) and the individual reviews with the
// QA reviewer's written feedback. Both filter branch-wise; a branch manager is
// pinned to their own branch server-side regardless of what's selected here.
import React, { useCallback, useEffect, useState } from 'react';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import { qaReviewsApi, usersApi, branchesApi } from '../../lib/endpoints';

const PAGE_SIZE = 50;

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const scoreColor = (pct) => (pct == null ? '#94a3b8' : pct >= 80 ? '#2e7d32' : pct >= 60 ? '#f57c00' : '#d32f2f');

const ScorePill = ({ pct }) => (
  <Chip
    size="small"
    label={pct == null ? '—' : `${Math.round(Number(pct))}%`}
    sx={{ height: 22, fontWeight: 700, color: '#fff', background: scoreColor(pct == null ? null : Number(pct)) }}
  />
);

export default function QaFeedback() {
  const [summary, setSummary] = useState({ by_counsellor: [], by_parameter: [] });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [counsellors, setCounsellors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [counsellorId, setCounsellorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    (async () => {
      const [users, brs] = await Promise.all([
        usersApi.options().catch(() => ({ data: [] })),
        branchesApi.list().catch(() => ({ data: [] })),
      ]);
      setCounsellors(users?.data || []);
      setBranches(brs?.data || []);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const filters = {
      branch_id: branchId || undefined,
      counsellor_id: counsellorId || undefined,
      from: from || undefined,
      to: to || undefined,
    };
    try {
      const [list, sum] = await Promise.all([
        qaReviewsApi.list({ ...filters, page, limit: PAGE_SIZE }),
        // The scoreboard is branch/date scoped but never counsellor-scoped —
        // it's the comparison view.
        qaReviewsApi.summary({ branch_id: filters.branch_id, from: filters.from, to: filters.to })
          .catch(() => ({ data: { by_counsellor: [], by_parameter: [] } })),
      ]);
      setRows(Array.isArray(list?.data) ? list.data : []);
      setTotal(Number(list?.meta?.total) || 0);
      setSummary(sum?.data || { by_counsellor: [], by_parameter: [] });
    } catch (e) {
      setError(e?.message || 'Failed to load QA feedback');
    } finally {
      setLoading(false);
    }
  }, [branchId, counsellorId, from, to, page]);

  useEffect(() => { load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <FactCheckIcon />
        <h2 style={{ margin: 0 }}>QA Feedback</h2>
      </div>
      <p style={{ color: '#666', marginTop: 4 }}>
        Call-quality scores and written feedback from the QA team, by counsellor and branch.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Autocomplete
          size="small" options={branches} sx={{ minWidth: 200 }}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={branches.find((b) => b.id === branchId) || null}
          onChange={(_e, opt) => { setBranchId(opt?.id || ''); setPage(1); }}
          renderInput={(p) => <TextField {...p} label="Branch" placeholder="All branches" />}
        />
        <Autocomplete
          size="small" options={counsellors} sx={{ minWidth: 220 }}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={counsellors.find((u) => u.id === counsellorId) || null}
          onChange={(_e, opt) => { setCounsellorId(opt?.id || ''); setPage(1); }}
          renderInput={(p) => <TextField {...p} label="Counsellor" placeholder="All counsellors" />}
        />
        <TextField
          size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
          value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <TextField
          size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
          value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      {/* ---- Rubric averages across the current filter ---- */}
      {summary.by_parameter?.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {summary.by_parameter.map((p) => {
            const pct = p.max_score > 0 ? (Number(p.avg_score) / Number(p.max_score)) * 100 : null;
            return (
              <div key={p.code} style={{
                border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', minWidth: 150,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: '#94a3b8', textTransform: 'uppercase' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(pct) }}>
                  {Number(p.avg_score).toFixed(1)}
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}> / {Number(p.max_score)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Per-counsellor scoreboard ---- */}
      <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>By counsellor</h3>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 8px' }}>Counsellor</th>
              <th style={{ padding: '10px 8px' }}>Branch</th>
              <th style={{ padding: '10px 8px' }}>Calls reviewed</th>
              <th style={{ padding: '10px 8px' }}>Average score</th>
            </tr>
          </thead>
          <tbody>
            {summary.by_counsellor?.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#888' }}>No reviews in this range.</td></tr>
            ) : summary.by_counsellor.map((c) => (
              <tr key={`${c.counsellor_id}-${c.branch_id}`} style={{ borderBottom: '1px solid #f2f2f2' }}>
                <td style={{ padding: '10px 8px', fontWeight: 600 }}>{c.counsellor_name || '—'}</td>
                <td style={{ padding: '10px 8px', color: '#666' }}>{c.branch_name || '—'}</td>
                <td style={{ padding: '10px 8px', color: '#666' }}>{c.reviews}</td>
                <td style={{ padding: '10px 8px' }}><ScorePill pct={c.avg_percent} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Individual reviews with written feedback ---- */}
      <h3 style={{ fontSize: 15, margin: '0 0 8px' }}>Reviews ({total})</h3>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}><CircularProgress size={22} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 20, color: '#888' }}>No reviews match these filters.</div>
      ) : rows.map((r) => (
        <div key={r.id} style={{
          border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ScorePill pct={r.overall_percent} />
            <strong>{r.counsellor_name || '—'}</strong>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {r.lead_name || r.phone_raw || '—'}
              {r.branch_name ? ` · ${r.branch_name}` : ''}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
              {r.reviewer_name ? `Reviewed by ${r.reviewer_name} · ` : ''}{fmtDate(r.reviewed_at)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            {(r.scores || []).map((s) => (
              <span key={s.code} style={{ fontSize: 12, color: '#475569' }}>
                {s.name}: <strong>{Number(s.score)}</strong>
                <span style={{ color: '#94a3b8' }}>/{Number(s.max_score)}</span>
              </span>
            ))}
          </div>

          {r.comment && (
            <div style={{
              marginTop: 10, padding: '8px 12px', background: '#f8fafc',
              borderLeft: '3px solid #cbd5e1', borderRadius: 4,
              fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap',
            }}>
              {r.comment}
            </div>
          )}
        </div>
      ))}

      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button size="small" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span style={{ margin: '0 8px', fontSize: 13, color: '#666' }}>Page {page} of {pageCount}</span>
          <Button size="small" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
