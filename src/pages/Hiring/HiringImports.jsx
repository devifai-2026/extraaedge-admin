// Speedup Hiring — import history, with the failed and duplicate rows.
//
// Imports run in the background, so this is where they are watched and, more
// importantly, where "which rows did not come in, and why" is answered. That
// question gets asked days after the upload, which is why the rows are stored
// rather than returned once in a response.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Chip, CircularProgress, Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Tabs, Tab, LinearProgress,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import { hiringApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, lmsTokens } from '../../lib/lmsUi';

const { INK, MUTE, FAINT, LINE } = lmsTokens;

const STATUS_TINT = {
  queued: '#64748b', processing: '#2563eb', completed: '#059669', failed: '#dc2626',
};

// Small muted caption. Declared above its use — a const referenced before
// its declaration throws on render (temporal dead zone).
const Caption = ({ children }) => (
  <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 6 }}>{children}</div>
);

const fmtWhen = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return String(v); }
};

const TH = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 12px', fontSize: 11, fontWeight: 700,
    color: FAINT, textTransform: 'uppercase', letterSpacing: 0.6,
    borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap',
  }}
  >{children}
  </th>
);
const TD = ({ children, align = 'left', style }) => (
  <td style={{
    textAlign: align, padding: '11px 12px', fontSize: 13.5, color: INK,
    borderBottom: `1px solid ${LINE}`, ...style,
  }}
  >{children}
  </td>
);

export default function HiringImports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailTab, setDetailTab] = useState('failed');
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await hiringApi.imports();
      setRows(r?.data || []);
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not load imports' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll only while something is actually running, and stop as soon as it is
  // not — a permanent 4-second timer on an idle page is pure waste.
  useEffect(() => {
    const running = rows.some((r) => r.status === 'queued' || r.status === 'processing');
    clearInterval(pollRef.current);
    if (running) pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, [rows, load]);

  const openDetail = async (row, outcome = 'failed') => {
    setDetail(row);
    setDetailTab(outcome);
    try {
      const r = await hiringApi.importRows(row.id, outcome);
      setDetailRows(r?.data || []);
    } catch { setDetailRows([]); }
  };

  const switchTab = async (outcome) => {
    setDetailTab(outcome);
    try {
      const r = await hiringApi.importRows(detail.id, outcome);
      setDetailRows(r?.data || []);
    } catch { setDetailRows([]); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1240, mx: 'auto' }}>
      <PageHeader
        title="Imports"
        subtitle="Uploaded sheets, and the rows that need attention."
        icon={HistoryIcon}
      />

      <Card pad={0} style={{ overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} /></Box>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📥"
            title="No imports yet"
            text="Upload a candidate or interview sheet and it will appear here."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <TH>File</TH><TH>Type</TH><TH>When</TH><TH>Status</TH>
                  <TH align="center">Added</TH><TH align="center">Updated</TH>
                  <TH align="center">Failed</TH><TH aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <TD style={{ fontWeight: 600 }}>
                      {r.file_name || '—'}
                      {r.sheet_name && <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 400 }}>Sheet: {r.sheet_name}</div>}
                    </TD>
                    <TD>{r.kind === 'interview' ? 'Interviews' : 'Candidates'}</TD>
                    <TD>{fmtWhen(r.created_at)}</TD>
                    <TD>
                      <Chip
                        size="small" label={r.status}
                        sx={{
                          height: 20, fontSize: 11, fontWeight: 700,
                          color: STATUS_TINT[r.status],
                          background: `color-mix(in srgb, ${STATUS_TINT[r.status]} 12%, transparent)`,
                        }}
                      />
                      {(r.status === 'queued' || r.status === 'processing') && (
                        <LinearProgress sx={{ mt: 0.75, borderRadius: 999, height: 4 }} />
                      )}
                      {r.status === 'failed' && r.error && (
                        <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 3 }}>{r.error}</div>
                      )}
                    </TD>
                    <TD align="center">{r.created_rows}</TD>
                    <TD align="center">{r.updated_rows}</TD>
                    <TD align="center">
                      {r.failed_rows > 0
                        ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>{r.failed_rows}</span>
                        : <span style={{ color: FAINT }}>0</span>}
                    </TD>
                    <TD align="right">
                      {(r.failed_rows > 0 || r.duplicate_rows > 0) && (
                        <Button
                          size="small" onClick={() => openDetail(r, r.failed_rows > 0 ? 'failed' : 'duplicate')}
                          sx={{ textTransform: 'none' }}
                        >
                          Review
                        </Button>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rows.some((r) => r.unknown_statuses?.length > 0) && (
        <Alert severity="warning" sx={{ mt: 2, fontSize: 13 }}>
          Some imports had statuses that are not configured, so those rows came
          in without one. Add them under Hiring → Statuses, then re-import to
          fill them in.
        </Alert>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>
          {detail?.file_name || 'Import'} — rows to review
        </DialogTitle>
        <DialogContent dividers>
          <Tabs value={detailTab} onChange={(_e, v) => switchTab(v)} sx={{ mb: 2 }}>
            <Tab value="failed" label={`Failed (${detail?.failed_rows ?? 0})`} sx={{ textTransform: 'none' }} />
            <Tab value="duplicate" label={`Duplicates (${detail?.duplicate_rows ?? 0})`} sx={{ textTransform: 'none' }} />
          </Tabs>

          {detailTab === 'duplicate' && (
            <Caption>
              These rows matched someone already in the pool for the same
              position, so the existing record was updated instead of a second
              one being created.
            </Caption>
          )}

          {detailRows.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center', color: FAINT, fontSize: 13.5 }}>
              Nothing to show here.
            </Box>
          ) : (
            <Box sx={{ maxHeight: 380, overflow: 'auto', border: `1px solid ${LINE}`, borderRadius: 1, mt: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <TH>Row</TH><TH>Reason</TH><TH>Data</TH>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((d) => (
                    <tr key={d.id}>
                      <TD>{d.row_no}</TD>
                      <TD style={{ color: detailTab === 'failed' ? '#b91c1c' : MUTE }}>{d.reason}</TD>
                      <TD style={{ fontSize: 12, color: MUTE, maxWidth: 380, whiteSpace: 'normal' }}>
                        {Object.entries(d.raw || {})
                          .filter(([, v]) => String(v ?? '').trim() !== '')
                          .slice(0, 4)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ') || '—'}
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetail(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
