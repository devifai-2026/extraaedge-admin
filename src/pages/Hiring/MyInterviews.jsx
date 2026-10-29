// "My Interviews" — the panellist's own schedule.
//
// Deliberately NOT the hiring interviews table. That one lists every
// candidate in the pipeline with salaries and HR remarks, and is gated to HR
// roles. Anyone in the tenant can be invited onto a panel — a sales manager, a
// trainer, the super admin — so they need a surface that shows ONLY the
// interviews they personally sit on, and nothing else about hiring.
//
// The scoping is enforced server-side (/hiring/interviews/mine reads the
// caller from the token, never a query param), so this page cannot be coaxed
// into showing somebody else's schedule by editing a URL.
import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Snackbar, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import EventIcon from '@mui/icons-material/EventAvailableOutlined';
import { hiringApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';

const { INK, FAINT, LINE } = lmsTokens;

const MODES = { online: 'Online', in_person: 'In person', telephonic: 'Telephonic' };

// What a panellist can say. Free text alone is not enough to decide on a
// candidate — a verdict needs something sortable next to the prose.
const RECOMMENDATIONS = [
  { v: 'strong_yes', l: 'Strong yes', tint: '#15803d' },
  { v: 'yes', l: 'Yes', tint: '#16a34a' },
  { v: 'on_hold', l: 'On hold', tint: '#d97706' },
  { v: 'no', l: 'No', tint: '#dc2626' },
  { v: 'strong_no', l: 'Strong no', tint: '#991b1b' },
];

const fmtWhen = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return String(v); }
};

const TH = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 12px', fontSize: 11, fontWeight: 700,
    color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6,
    borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap',
  }}
  >
    {children}
  </th>
);

const TD = ({ children, align = 'left', style }) => (
  <td style={{
    textAlign: align, padding: '12px', fontSize: 13.5, color: INK,
    borderBottom: `1px solid ${LINE}`, ...style,
  }}
  >
    {children}
  </td>
);

export default function MyInterviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null);     // the interview being reviewed
  const [saving, setSaving] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await hiringApi.myInterviews();
      setRows(r?.data || []);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load your interviews' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Opening the feedback box also pulls what the rest of the panel said —
  // seeing a colleague's verdict is the point of a panel.
  const openFeedback = async (r) => {
    setForm({ id: r.id, candidate_name: r.candidate_name, remark: r.my_remark || '', recommendation: r.my_recommendation || '' });
    setPanelFeedback([]);
    try {
      const f = await hiringApi.feedback(r.id);
      setPanelFeedback(f?.data || []);
    } catch { /* feedback list is supplementary; the box still works */ }
  };

  const submit = async () => {
    setSaving(true);
    try {
      await hiringApi.submitFeedback(form.id, {
        remark: form.remark || null,
        recommendation: form.recommendation || null,
      });
      setForm(null);
      setToast({ severity: 'success', text: 'Feedback saved' });
      load();
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not save feedback' });
    } finally { setSaving(false); }
  };

  // An interview in the future cannot be reviewed yet — the server refuses it
  // too, but saying so here avoids a pointless round-trip and a red error.
  const isUpcoming = (r) => r.scheduled_at && new Date(r.scheduled_at).getTime() > Date.now();

  return (
    <Box sx={{ p: 3, maxWidth: 1180, mx: 'auto' }}>
      <PageHeader
        title="My Interviews"
        subtitle="Interviews you are on the panel for."
        icon={EventIcon}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No interviews yet"
            text="When someone invites you onto an interview panel, it will appear here."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
              <thead>
                <tr>
                  <TH>Candidate</TH><TH>Position</TH><TH>Round</TH><TH>When</TH>
                  <TH>Mode</TH><TH>Your feedback</TH><TH aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rec = RECOMMENDATIONS.find((x) => x.v === r.my_recommendation);
                  return (
                    <tr key={r.id}>
                      <TD style={{ fontWeight: 600 }}>
                        {r.candidate_name}
                        {r.candidate_phone && (
                          <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 400 }}>{r.candidate_phone}</div>
                        )}
                      </TD>
                      <TD>{r.position_title || <span style={{ color: FAINT }}>—</span>}</TD>
                      <TD>
                        {r.round_name
                          ? <Chip size="small" label={r.round_name} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                          : <span style={{ color: FAINT }}>—</span>}
                      </TD>
                      <TD>
                        {fmtWhen(r.scheduled_at)}
                        {r.meeting_link && (
                          <div>
                            <a
                              href={r.meeting_link} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11.5, color: '#1976d2' }}
                            >
                              Join link ↗
                            </a>
                          </div>
                        )}
                      </TD>
                      <TD>{MODES[r.mode] || <span style={{ color: FAINT }}>—</span>}</TD>
                      <TD>
                        {rec
                          ? <span style={{ color: rec.tint, fontWeight: 700, fontSize: 12.5 }}>{rec.l}</span>
                          : r.my_remark
                            ? <span style={{ fontSize: 12.5 }}>Given</span>
                            : isUpcoming(r)
                              ? <span style={{ color: FAINT, fontSize: 12.5 }}>Upcoming</span>
                              : <span style={{ color: '#d97706', fontSize: 12.5, fontWeight: 600 }}>Pending</span>}
                      </TD>
                      <TD align="right">
                        <Button
                          size="small"
                          onClick={() => openFeedback(r)}
                          disabled={isUpcoming(r)}
                          sx={{ textTransform: 'none' }}
                        >
                          {r.my_remark || r.my_recommendation ? 'Edit feedback' : 'Add feedback'}
                        </Button>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!form} onClose={() => setForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          Feedback — {form?.candidate_name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            <TextField
              select size="small" label="Recommendation"
              value={form?.recommendation ?? ''}
              onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
            >
              <MenuItem value="">—</MenuItem>
              {RECOMMENDATIONS.map((r) => <MenuItem key={r.v} value={r.v}>{r.l}</MenuItem>)}
            </TextField>
            <TextField
              size="small" label="Your remark" multiline rows={4}
              value={form?.remark ?? ''}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />

            {/* What the rest of the panel said. Shown read-only: each person
                owns their own row and cannot edit anybody else's. */}
            {panelFeedback.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                  Panel feedback
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {panelFeedback.map((f) => {
                    const rec = RECOMMENDATIONS.find((x) => x.v === f.recommendation);
                    return (
                      <div key={f.id} style={{ padding: '8px 12px', background: '#fafafa', border: `1px solid ${LINE}`, borderRadius: 6 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                          {f.user_name}
                          {rec && <span style={{ color: rec.tint, fontWeight: 700, marginLeft: 8 }}>{rec.l}</span>}
                        </div>
                        {f.remark && <div style={{ fontSize: 12.5, color: '#444', marginTop: 2 }}>{f.remark}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setForm(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={saving || (!form?.remark && !form?.recommendation)}
            variant="contained"
            sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
          >
            {saving ? 'Saving…' : 'Save feedback'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : null}
      </Snackbar>
    </Box>
  );
}
