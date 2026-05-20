import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, IconButton, Chip, CircularProgress, Tooltip,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { admissionsApi } from '../../lib/endpoints';
import { fmtDate } from './utils';
import './Accounts.css';

// Unified "what's next on the accounts team's plate" queue. Two row kinds
// share this table:
//   • source_kind === 'lead'      → the lead converted but has NO admission
//     row. The CTA is "Start admission form" which jumps to
//     /accounts/new-admission/:leadId (the form hydrates from the lead).
//   • source_kind === 'admission' → an auto-stub or manual row sitting in
//     'pending_approval'. The CTA is "Verify & Approve" (single click) or
//     "Open" to go into the AdmissionDetail page.
//
// Newest first; backend already sorted by event_at DESC.
const PendingAdmissions = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.pendingAdmissions();
      setRows(r?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Live refresh: socket pushes 'admission.pending' whenever a lead
  // converts. We listen on window because the Header bell already wires
  // the socket as a side-effect and forwards `notification` events to
  // window dispatchEvent (or we just refetch on focus as a safety net).
  // Keep it simple — re-fetch on window focus + a polling fallback.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Pending Admissions</div>
          <div className="accounts-page-subtitle">
            Converted leads waiting for the admission form, plus admissions
            awaiting verification. Newest first.
          </div>
        </div>
        <Tooltip title="Refresh">
          <IconButton onClick={reload}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </div>

      <div className="accounts-table-card">
        {loading ? (
          <div className="accounts-empty"><CircularProgress size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="accounts-empty">
            🎉 All clear. No leads are waiting on admission.
          </div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Converted At</th>
                <th>Student</th>
                <th>Course</th>
                <th>Owner</th>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PendingRow key={`${r.source_kind}-${r.source_id}`} row={r} onChanged={reload} navigate={navigate} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const PendingRow = ({ row, onChanged, navigate }) => {
  const [busy, setBusy] = useState(false);
  const isLead = row.source_kind === 'lead';

  const approve = async () => {
    setBusy(true);
    try {
      await admissionsApi.approve(row.admission_id);
      onChanged?.();
    } catch { /* swallow; user can retry */ }
    finally { setBusy(false); }
  };

  return (
    <tr>
      <td>{fmtDate(row.event_at)}</td>
      <td>
        <div style={{ fontWeight: 600 }}>{row.student_name || '—'}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {row.email || row.whatsapp_number || '—'}
        </div>
      </td>
      <td>{row.program_name || '—'}</td>
      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.owner_name || '—'}</td>
      <td>
        {isLead ? (
          <Chip
            size="small"
            label="No admission form"
            sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        ) : (
          <Chip
            size="small"
            label="Awaiting verification"
            sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        )}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {isLead ? (
          <Button
            size="small"
            variant="contained"
            startIcon={<AssignmentIndIcon />}
            onClick={() => navigate(`/accounts/new-admission/${row.lead_id}`)}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            Start admission form
          </Button>
        ) : (
          <>
            <Button
              size="small"
              onClick={() => navigate(`/accounts/admission/${row.admission_id}`)}
              sx={{ textTransform: 'none', mr: 1 }}
            >
              Open
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={approve}
              disabled={busy}
              sx={{ textTransform: 'none' }}
            >
              Verify &amp; Approve
            </Button>
          </>
        )}
      </td>
    </tr>
  );
};

export default PendingAdmissions;
