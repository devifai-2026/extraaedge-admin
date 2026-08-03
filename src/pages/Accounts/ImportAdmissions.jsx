import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Chip, CircularProgress, IconButton, Tabs, Tab, Tooltip, Snackbar, Alert, Checkbox,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { bulkAdmissionsApi } from '../../lib/endpoints';
import { onNotification } from '../../lib/socket';
import UploadAdmissions from '../../components/UploadAdmissions/UploadAdmissions';
import { fmtDate } from './utils';
import './Accounts.css';

// Landing page for the historical-admission importer. Three tabs, mirroring
// the counsellors' Bulk Upload + Failed Leads pair but scoped to admission
// imports:
//   Imports      — what was uploaded, and how it went
//   Problem rows — rows that didn't import, with the reason
//   Already here — rows that matched a student already in the CRM
const TABS = [
  { key: 'imports', label: 'Imports' },
  { key: 'failures', label: 'Problem rows' },
  { key: 'duplicates', label: 'Already here' },
];

const statusChip = (status) => {
  const map = {
    completed: { bg: '#dcfce7', fg: '#166534', label: 'Completed' },
    processing: { bg: '#dbeafe', fg: '#1e40af', label: 'Importing' },
    queued: { bg: '#f1f5f9', fg: '#475569', label: 'Queued' },
    failed: { bg: '#fee2e2', fg: '#991b1b', label: 'Failed' },
  };
  const s = map[status] || map.queued;
  return <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600 }} />;
};

const ImportAdmissions = () => {
  const [tab, setTab] = useState('imports');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ failures: 0, duplicates: 0 });
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected([]);
    try {
      const [listRes, summaryRes] = await Promise.all([
        tab === 'imports' ? bulkAdmissionsApi.imports({ limit: 100 })
          : tab === 'failures' ? bulkAdmissionsApi.failures({ limit: 200 })
            : bulkAdmissionsApi.duplicates({ limit: 200 }),
        bulkAdmissionsApi.summary().catch(() => null),
      ]);
      setRows(listRes?.data || []);
      if (summaryRes?.data) setCounts(summaryRes.data);
    } catch (e) {
      setToast({ severity: 'error', message: e?.message || 'Could not load imports' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Refresh when the worker reports an import finished, so the list stops
  // showing "Importing" without the user having to hit refresh.
  useEffect(() => onNotification((evt) => {
    if (evt?.type !== 'bulk_import.progress') return;
    if (evt.payload?.kind !== 'admissions') return;
    if (evt.payload?.phase === 'completed') load();
  }), [load]);

  const downloadOriginal = async (id) => {
    try {
      const res = await bulkAdmissionsApi.importFile(id);
      const url = res?.data?.url;
      if (!url) throw new Error('That file is no longer available');
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setToast({ severity: 'error', message: e?.message || 'Download failed' });
    }
  };

  const clearSelected = async () => {
    if (!selected.length) return;
    try {
      const fn = tab === 'failures' ? bulkAdmissionsApi.deleteFailures : bulkAdmissionsApi.deleteDuplicates;
      const res = await fn(selected);
      setToast({ severity: 'success', message: `Cleared ${res?.data?.deleted ?? 0} row(s)` });
      load();
    } catch (e) {
      setToast({ severity: 'error', message: e?.message || 'Could not clear those rows' });
    }
  };

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (s.length === rows.length ? [] : rows.map((r) => r.id)));

  // The raw sheet row is stored as jsonb; show enough of it to recognise the
  // student without dumping ~90 columns into the table.
  const describeRow = (raw) => {
    const name = [raw?.first_name, raw?.last_name].filter(Boolean).join(' ');
    return name || raw?.email || raw?.whatsapp_number || '(no name on this row)';
  };

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Import past admissions</div>
          <div className="accounts-page-subtitle">
            Bring students, fee plans and payments already collected across from a previous system.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small"><RefreshIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => setUploadOpen(true)}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            Import from spreadsheet
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, minHeight: 40, '& .MuiTab-root': { textTransform: 'none', minHeight: 40, fontSize: 13.5 } }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            label={
              t.key === 'imports'
                ? t.label
                : `${t.label} (${t.key === 'failures' ? counts.failures : counts.duplicates})`
            }
          />
        ))}
      </Tabs>

      {(tab === 'failures' || tab === 'duplicates') && selected.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={clearSelected}
            sx={{ textTransform: 'none', color: '#dc2626' }}
          >
            Clear {selected.length} row{selected.length === 1 ? '' : 's'} from this list
          </Button>
        </div>
      )}

      <div className="accounts-table-card">
        {loading ? (
          <div className="accounts-empty"><CircularProgress size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="accounts-empty">
            {tab === 'imports'
              ? 'No imports yet. Click "Import from spreadsheet" to download the template and get started.'
              : tab === 'failures'
                ? 'No problem rows — every row imported cleanly.'
                : 'No rows matched a student already in the CRM.'}
          </div>
        ) : tab === 'imports' ? (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Uploaded</th>
                <th>By</th>
                <th style={{ textAlign: 'right' }}>Rows</th>
                <th style={{ textAlign: 'right' }}>Imported</th>
                <th style={{ textAlign: 'right' }}>Problems</th>
                <th style={{ textAlign: 'right' }}>Already here</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.file_name || '(unnamed file)'}</td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>{r.uploaded_by_name || r.uploaded_by_email || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.total_rows}</td>
                  <td style={{ textAlign: 'right', color: '#166534', fontWeight: 600 }}>{r.success_rows}</td>
                  <td style={{ textAlign: 'right', color: r.failed_rows ? '#991b1b' : undefined }}>{r.failed_rows}</td>
                  <td style={{ textAlign: 'right' }}>{r.duplicate_rows}</td>
                  <td>{statusChip(r.status)}</td>
                  <td>
                    <Tooltip title="Download the file as uploaded">
                      <span>
                        <IconButton size="small" onClick={() => downloadOriginal(r.id)} disabled={!r.file_r2_key}>
                          <FileDownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'failures' ? (
          <table className="accounts-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <Checkbox size="small" checked={selected.length === rows.length} onChange={toggleAll} />
                </th>
                <th>Row</th>
                <th>Student</th>
                <th>Problem</th>
                <th>What to fix</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td>{r.row_number || '—'}</td>
                  <td>{describeRow(r.raw_row_json)}</td>
                  <td>
                    <Chip
                      size="small"
                      label={r.error_code}
                      sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}
                    />
                  </td>
                  <td style={{ maxWidth: 460, whiteSpace: 'normal' }}>{r.error_message}</td>
                  <td>{r.file_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <Checkbox size="small" checked={selected.length === rows.length} onChange={toggleAll} />
                </th>
                <th>Row</th>
                <th>Student in the sheet</th>
                <th>Matched</th>
                <th>Existing record</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Checkbox size="small" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td>{r.row_number}</td>
                  <td>{describeRow(r.raw_row_json)}</td>
                  <td>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{r.match_field}</span>
                    <br />
                    {r.match_value}
                  </td>
                  <td>{r.matched_lead_name || r.matched_lead_email || '—'}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 380 }}>
                    {r.resolution === 'merged' ? (
                      <Chip size="small" label="Attached to the existing lead" sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
                    ) : r.matched_lead_has_admission ? (
                      <Chip size="small" label="Already fully in the system — nothing imported" sx={{ bgcolor: '#fef3c7', color: '#92400e' }} />
                    ) : (
                      <Chip size="small" label="Skipped" sx={{ bgcolor: '#f1f5f9', color: '#475569' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UploadAdmissions open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={load} />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert> : null}
      </Snackbar>
    </div>
  );
};

export default ImportAdmissions;
