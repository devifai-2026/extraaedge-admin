// QA review queue — the reviewer's working surface.
//
// Lists MATCHED call recordings (already attached to a lead, and through the
// uploader to the counsellor who made the call), plays them inline, and
// captures a rubric score + feedback comment per call. Pending is the default
// filter so the queue drains as it's worked.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import RateReviewIcon from '@mui/icons-material/RateReview';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import { qaReviewsApi, deviceRecordingsApi, usersApi, branchesApi } from '../../lib/endpoints';

const PAGE_SIZE = 50;

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const fmtDuration = (s) => {
  if (s == null) return '—';
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// Colour the score the way the reports do: green ≥80, amber ≥60, red below.
const scoreColor = (pct) => (pct == null ? '#94a3b8' : pct >= 80 ? '#2e7d32' : pct >= 60 ? '#f57c00' : '#d32f2f');

// Loads a signed URL on demand, then renders a native <audio> player.
function RecordingPlayer({ recordingId, autoLoad = false }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await deviceRecordingsApi.playUrl(recordingId);
      const u = r?.data?.url;
      if (!u) throw new Error('No playback URL');
      setUrl(u);
    } catch (e) {
      setError(e?.message || 'Could not load recording');
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => { if (autoLoad) load(); }, [autoLoad, load]);

  if (url) return <audio controls src={url} preload="none" style={{ height: 34, maxWidth: 260 }} />;
  return (
    <>
      <Button variant="text" size="small" onClick={load} disabled={loading}
        startIcon={loading ? <CircularProgress size={14} /> : <GraphicEqIcon fontSize="small" />}>
        {loading ? 'Loading…' : 'Listen'}
      </Button>
      {error && <span style={{ fontSize: 11, color: '#d32f2f', marginLeft: 6 }}>{error}</span>}
    </>
  );
}

// Score dialog: one star row per rubric parameter + a feedback comment.
// Stars are used rather than a numeric field because every parameter is
// scored on the same small integer scale (max_score, default 5).
function ReviewDialog({ open, recording, parameters, onClose, onSaved }) {
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setScores({}); setComment(''); setError(''); }
  }, [open, recording?.id]);

  const maxTotal = useMemo(
    () => parameters.reduce((sum, p) => sum + Number(p.max_score || 5), 0),
    [parameters],
  );
  const total = useMemo(
    () => parameters.reduce((sum, p) => sum + Number(scores[p.id] || 0), 0),
    [parameters, scores],
  );
  const allScored = parameters.length > 0 && parameters.every((p) => scores[p.id] > 0);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await qaReviewsApi.submit(recording.id, {
        scores: parameters.map((p) => ({ parameter_id: p.id, score: Number(scores[p.id] || 0) })),
        comment: comment.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e?.message || 'Failed to save the review');
    } finally {
      setSaving(false);
    }
  };

  if (!recording) return null;
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Rate this call
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
          {recording.counsellor_name || 'Unknown counsellor'} · {recording.lead_name || recording.phone_raw}
          {recording.branch_name ? ` · ${recording.branch_name}` : ''}
        </div>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <div style={{ marginBottom: 16 }}>
          <RecordingPlayer recordingId={recording.id} autoLoad />
        </div>

        {parameters.length === 0 ? (
          <Alert severity="info">No rubric parameters are configured.</Alert>
        ) : parameters.map((p) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: 14 }}>{p.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Rating
                value={Number(scores[p.id] || 0)}
                max={Number(p.max_score) || 5}
                onChange={(_e, v) => setScores((s) => ({ ...s, [p.id]: v || 0 }))}
              />
              <span style={{ fontSize: 12, color: '#94a3b8', width: 34, textAlign: 'right' }}>
                {scores[p.id] || 0}/{Number(p.max_score) || 5}
              </span>
            </span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, margin: '12px 0 4px', fontSize: 14 }}>
          <span style={{ color: '#64748b' }}>Overall</span>
          <strong style={{ color: scoreColor(pct) }}>{total}/{maxTotal} · {pct}%</strong>
        </div>

        <TextField
          label="Feedback" multiline minRows={3} fullWidth size="small" sx={{ mt: 1 }}
          value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="What went well, what to improve — the counsellor's manager sees this."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained" disableElevation onClick={save}
          disabled={saving || !allScored}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {saving ? 'Saving…' : 'Submit review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function QaReviewQueue() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parameters, setParameters] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [counsellorId, setCounsellorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [reviewFor, setReviewFor] = useState(null);

  useEffect(() => {
    (async () => {
      const [params, users, brs] = await Promise.all([
        qaReviewsApi.parameters().catch(() => ({ data: [] })),
        usersApi.options().catch(() => ({ data: [] })),
        branchesApi.list().catch(() => ({ data: [] })),
      ]);
      setParameters(params?.data || []);
      setCounsellors(users?.data || []);
      setBranches(brs?.data || []);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await qaReviewsApi.queue({
        status, page, limit: PAGE_SIZE,
        counsellor_id: counsellorId || undefined,
        branch_id: branchId || undefined,
      });
      setRows(Array.isArray(r?.data) ? r.data : []);
      setTotal(Number(r?.meta?.total) || 0);
    } catch (e) {
      setError(e?.message || 'Failed to load the review queue');
    } finally {
      setLoading(false);
    }
  }, [status, page, counsellorId, branchId]);

  useEffect(() => { load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <RateReviewIcon />
        <h2 style={{ margin: 0 }}>Call Reviews</h2>
      </div>
      <p style={{ color: '#666', marginTop: 4 }}>
        Recordings attached to a lead, grouped by the counsellor who made the call. Listen, score
        against the rubric, and leave feedback — managers see it on the QA Feedback report.
      </p>

      <Tabs
        value={status}
        onChange={(_e, v) => { setStatus(v); setPage(1); }}
        sx={{ mb: 1, minHeight: 40 }}
      >
        <Tab value="pending" label="Pending" sx={{ minHeight: 40 }} />
        <Tab value="reviewed" label="Reviewed" sx={{ minHeight: 40 }} />
        <Tab value="all" label="All" sx={{ minHeight: 40 }} />
      </Tabs>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Autocomplete
          size="small" options={counsellors} sx={{ minWidth: 220 }}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={counsellors.find((u) => u.id === counsellorId) || null}
          onChange={(_e, opt) => { setCounsellorId(opt?.id || ''); setPage(1); }}
          renderInput={(p) => <TextField {...p} label="Counsellor" placeholder="All counsellors" />}
        />
        <Autocomplete
          size="small" options={branches} sx={{ minWidth: 200 }}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={branches.find((b) => b.id === branchId) || null}
          onChange={(_e, opt) => { setBranchId(opt?.id || ''); setPage(1); }}
          renderInput={(p) => <TextField {...p} label="Branch" placeholder="All branches" />}
        />
      </div>

      {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 8px' }}>Counsellor</th>
              <th style={{ padding: '10px 8px' }}>Lead</th>
              <th style={{ padding: '10px 8px' }}>Branch</th>
              <th style={{ padding: '10px 8px' }}>Duration</th>
              <th style={{ padding: '10px 8px' }}>Uploaded</th>
              <th style={{ padding: '10px 8px' }}>Recording</th>
              <th style={{ padding: '10px 8px' }}>Score</th>
              <th style={{ padding: '10px 8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center' }}><CircularProgress size={22} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#888' }}>
                {status === 'pending' ? 'Nothing waiting to be reviewed.' : 'No recordings here.'}
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.counsellor_name || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{r.lead_name || r.phone_raw || '—'}</td>
                <td style={{ padding: '10px 8px', color: '#666' }}>{r.branch_name || '—'}</td>
                <td style={{ padding: '10px 8px', color: '#666' }}>{fmtDuration(r.duration_seconds)}</td>
                <td style={{ padding: '10px 8px', color: '#666' }}>{fmtDate(r.uploaded_at)}</td>
                <td style={{ padding: '10px 8px' }}><RecordingPlayer recordingId={r.id} /></td>
                <td style={{ padding: '10px 8px' }}>
                  {r.review_id ? (
                    <Chip
                      size="small"
                      label={`${Math.round(Number(r.overall_percent))}%`}
                      sx={{ height: 22, fontWeight: 700, color: '#fff', background: scoreColor(Number(r.overall_percent)) }}
                    />
                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <Button
                    variant={r.review_id ? 'text' : 'outlined'} size="small"
                    startIcon={<RateReviewIcon fontSize="small" />}
                    onClick={() => setReviewFor(r)}
                  >
                    {r.review_id ? 'Re-rate' : 'Rate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ color: '#888', fontSize: 13 }}>{total} recording{total === 1 ? '' : 's'}</span>
        {pageCount > 1 && (
          <span>
            <Button size="small" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span style={{ margin: '0 8px', fontSize: 13, color: '#666' }}>Page {page} of {pageCount}</span>
            <Button size="small" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </span>
        )}
      </div>

      <ReviewDialog
        open={Boolean(reviewFor)}
        recording={reviewFor}
        parameters={parameters}
        onClose={() => setReviewFor(null)}
        onSaved={() => { setReviewFor(null); load(); }}
      />
    </div>
  );
}
