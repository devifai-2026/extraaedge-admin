import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, IconButton, TextField, InputAdornment, CircularProgress, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { admissionsApi } from '../../lib/endpoints';
import { fullName, fmtDate, fmtMoney } from './utils';
import StatusPill from './StatusPill';
import './Accounts.css';

// One component, five list pages — the page-specific behavior is fully
// driven by props (status filter, page title, action set). Keeps the
// list code DRY across Approvals / Attendings / Break / Total / Month.
//
// Props:
//   title       — page heading
//   subtitle    — optional description under heading
//   statusFilter— 'pending_approval' | 'attending' | 'on_break' | null (all)
//   monthScope  — if true, restricts query to current calendar month
//   showCreate  — adds an "Add Admission" button → /accounts/new-admission
//   actions     — array of { label, color, icon, when(row), onClick(row) }
//   showFees    — adds Fees / Paid / Pending columns (used on Break)
const AdmissionsList = ({
  title, subtitle, statusFilter, monthScope, showCreate, actions, showFees,
}) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (q) params.q = q;
      if (monthScope) {
        const now = new Date();
        params.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
      const r = await admissionsApi.list(params);
      setRows(r?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q, monthScope]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">{title}</div>
          {subtitle && <div className="accounts-page-subtitle">{subtitle}</div>}
        </div>
        {showCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/accounts/new-admission')}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            New Admission
          </Button>
        )}
      </div>

      <div className="accounts-filter-bar">
        <div className="accounts-filter-field" style={{ flex: 1, maxWidth: 320 }}>
          <span className="accounts-filter-label">Search</span>
          <TextField
            size="small"
            placeholder="Name, email or contact"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </div>
      </div>

      <div className="accounts-table-card">
        {loading ? (
          <div className="accounts-empty"><CircularProgress size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="accounts-empty">No admissions to show.</div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Admission Date</th>
                <th>Student</th>
                <th>Course</th>
                <th>Mode</th>
                <th>Status</th>
                {showFees && <th style={{ textAlign: 'right' }}>Fees</th>}
                {showFees && <th style={{ textAlign: 'right' }}>Paid</th>}
                {showFees && <th style={{ textAlign: 'right' }}>Pending</th>}
                <th>Contact</th>
                {actions?.length > 0 && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <AdmissionRow
                  key={r.id}
                  row={r}
                  actions={actions}
                  showFees={showFees}
                  onChanged={reload}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const AdmissionRow = ({ row, actions, showFees, onChanged }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);

  // Lazily fetch full detail when this row is shown in "showFees" mode —
  // the list endpoint doesn't compute paid_till_date, so we need /:id.
  useEffect(() => {
    if (!showFees) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const r = await admissionsApi.get(row.id);
        if (alive) setDetail(r?.data);
      } catch {
        if (alive) setDetail(null);
      }
    };
    load();
    return () => { alive = false; };
  }, [showFees, row.id]);

  const paid = Number(detail?.paid_till_date ?? 0);
  const pending = Number(detail?.pending_fees ?? row.total_fees ?? 0);

  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounts/admission/${row.id}`)}>
      <td>{fmtDate(row.admission_date)}</td>
      <td>{fullName(row)}<div style={{ fontSize: 11, color: '#9ca3af' }}>{row.email || '—'}</div></td>
      <td>{row.program_name || '—'}</td>
      <td>{row.mode_of_training || '—'}</td>
      <td><StatusPill status={row.status} /></td>
      {showFees && <td style={{ textAlign: 'right' }}>₹ {fmtMoney(row.total_fees)}</td>}
      {showFees && <td style={{ textAlign: 'right' }}>₹ {fmtMoney(paid)}</td>}
      {showFees && <td style={{ textAlign: 'right' }}>₹ {fmtMoney(pending)}</td>}
      <td style={{ fontSize: 12 }}>{row.whatsapp_number}</td>
      {actions?.length > 0 && (
        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          {actions.filter((a) => !a.when || a.when(row)).map((a) => (
            <Tooltip key={a.label} title={a.label}>
              <span>
                <IconButton
                  size="small"
                  onClick={async () => {
                    await a.onClick(row);
                    onChanged?.();
                  }}
                  sx={{ color: a.color || '#374151' }}
                >
                  {a.icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </td>
      )}
    </tr>
  );
};

// ============================================================================
// Page exports — one per sidebar item, all driven by AdmissionsList props.
// ============================================================================

export const ApprovalsPage = () => (
  <AdmissionsList
    title="Approvals"
    subtitle="Admissions awaiting verification. Approve to move into Attending, or delete if invalid."
    statusFilter="pending_approval"
    showCreate
    actions={[
      {
        label: 'Verify & Approve',
        color: '#10b981',
        icon: <CheckCircleIcon fontSize="small" />,
        onClick: (r) => admissionsApi.approve(r.id),
      },
      {
        label: 'Delete',
        color: '#dc2626',
        icon: <DeleteOutlineIcon fontSize="small" />,
        onClick: (r) => admissionsApi.delete(r.id),
      },
    ]}
  />
);

export const AttendingsPage = () => (
  <AdmissionsList
    title="Attendings"
    subtitle="Active students currently in session."
    statusFilter="attending"
    actions={[
      {
        label: 'Move to Break',
        color: '#f59e0b',
        icon: <PauseCircleIcon fontSize="small" />,
        onClick: (r) => {
          const reason = window.prompt('Reason for break (optional):') || '';
          return admissionsApi.break(r.id, reason);
        },
      },
    ]}
  />
);

export const BreakPage = () => (
  <AdmissionsList
    title="On Break"
    subtitle="Students enrolled but currently paused. Fees totals shown so you can chase pending dues."
    statusFilter="on_break"
    showFees
    actions={[
      {
        label: 'Resume',
        color: '#10b981',
        icon: <PlayCircleIcon fontSize="small" />,
        onClick: (r) => admissionsApi.resume(r.id),
      },
    ]}
  />
);

export const ThisMonthAdmissionsPage = () => (
  <AdmissionsList
    title="This Month Admissions"
    subtitle="Every admission joined this calendar month, all statuses."
    monthScope
    showCreate
  />
);

export const TotalAdmissionsPage = () => (
  <AdmissionsList
    title="Total Admissions"
    subtitle="Every admission ever recorded, all statuses."
    showCreate
  />
);

export default AdmissionsList;
