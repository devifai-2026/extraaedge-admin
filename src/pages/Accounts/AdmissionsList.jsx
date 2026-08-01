import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, IconButton, TextField, InputAdornment, CircularProgress, Tooltip,
  Autocomplete, MenuItem, Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { admissionsApi, programsApi, usersApi } from '../../lib/endpoints';
import { fullName, fmtDate, fmtMoney } from './utils';
import StatusPill from './StatusPill';
import './Accounts.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'attending', label: 'Attending' },
  { value: 'on_break', label: 'On Break' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

// Local YYYY-MM-DD helper (avoids UTC shift for Asia/Kolkata users).
const ymd = (d) => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

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
  // Filters (server-side via the existing /admissions list params).
  const [programId, setProgramId] = useState('');
  const [centerId, setCenterId] = useState('');
  const [counsellorId, setCounsellorId] = useState('');
  const [status, setStatus] = useState('');   // only used when the page isn't status-locked
  const [dateFrom, setDateFrom] = useState(''); // admission_date >=
  const [dateTo, setDateTo] = useState('');     // admission_date <=

  // Dropdown option sources.
  const [programs, setPrograms] = useState([]);
  const [centers, setCenters] = useState([]);
  const [users, setUsers] = useState([]);

  const activeFilterCount = useMemo(
    () => [programId, centerId, counsellorId, status, dateFrom, dateTo, q].filter(Boolean).length,
    [programId, centerId, counsellorId, status, dateFrom, dateTo, q],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      // statusFilter (page-locked) wins; otherwise honor the status dropdown.
      if (statusFilter) params.status = statusFilter;
      else if (status) params.status = status;
      if (q) params.q = q;
      if (programId) params.program_id = programId;
      if (centerId) params.center_id = centerId;
      if (counsellorId) params.guided_by_counsellor_id = counsellorId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
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
  }, [statusFilter, status, q, monthScope, programId, centerId, counsellorId, dateFrom, dateTo]);

  // Debounce so typing search / rapid filter changes don't fire per keystroke.
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  // Load dropdown option sources once. Failures degrade to empty dropdowns.
  useEffect(() => {
    (async () => {
      try {
        const [pr, ce, us] = await Promise.all([
          programsApi.list().catch(() => ({ data: [] })),
          admissionsApi.centers.list().catch(() => ({ data: [] })),
          usersApi.options().catch(() => ({ data: [] })),
        ]);
        setPrograms(pr?.data || []);
        setCenters(ce?.data || []);
        setUsers((us?.data || []).filter((u) => u?.is_active !== false));
      } catch { /* dropdowns stay empty */ }
    })();
  }, []);

  const clearAll = () => {
    setQ(''); setProgramId(''); setCenterId(''); setCounsellorId('');
    setStatus(''); setDateFrom(''); setDateTo('');
  };

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

      <div
        className="accounts-filter-bar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}
      >
        <TextField
          size="small"
          placeholder="Name, email or contact"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />

        <Autocomplete
          size="small"
          options={programs}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={programs.find((p) => p.id === programId) || null}
          onChange={(_e, opt) => setProgramId(opt?.id || '')}
          sx={{ minWidth: 210 }}
          renderInput={(params) => <TextField {...params} label="Course" placeholder="All courses" />}
        />

        <Autocomplete
          size="small"
          options={users}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={users.find((u) => u.id === counsellorId) || null}
          onChange={(_e, opt) => setCounsellorId(opt?.id || '')}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} label="Counsellor" placeholder="All counsellors" />}
        />

        <Autocomplete
          size="small"
          options={centers}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={centers.find((c) => c.id === centerId) || null}
          onChange={(_e, opt) => setCenterId(opt?.id || '')}
          sx={{ minWidth: 180 }}
          renderInput={(params) => <TextField {...params} label="Center" placeholder="All centers" />}
        />

        {/* Status dropdown only when the page isn't already locked to one status. */}
        {!statusFilter && (
          <TextField
            select size="small" label="Status" value={status}
            onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 170 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
        )}

        {/* Admission-date range. Disabled when the page is month-scoped
            (This Month page already restricts to the current month). */}
        <TextField
          type="date" size="small" label="From"
          InputLabelProps={{ shrink: true }}
          value={dateFrom} onChange={(e) => setDateFrom(ymd(e.target.value))}
          disabled={monthScope} sx={{ minWidth: 150 }}
        />
        <TextField
          type="date" size="small" label="To"
          InputLabelProps={{ shrink: true }}
          value={dateTo} onChange={(e) => setDateTo(ymd(e.target.value))}
          disabled={monthScope} sx={{ minWidth: 150 }}
        />

        {activeFilterCount > 0 && (
          <Button
            size="small" startIcon={<ClearIcon />} onClick={clearAll}
            sx={{ textTransform: 'none', color: '#6b7280' }}
          >
            Clear all
          </Button>
        )}
        <Chip
          size="small"
          label={`${rows.length} result${rows.length === 1 ? '' : 's'}`}
          sx={{ ml: 'auto', height: 26, fontWeight: 600 }}
        />
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
                <th>Counsellor</th>
                <th>Center</th>
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
      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.guided_by_counsellor_name || '—'}</td>
      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.center_name || '—'}</td>
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

// Drop action — available on Attending / On-break students. Confirms, asks an
// optional reason, then drops (stops reminders + moves them to Drop Candidates).
const dropAction = {
  label: 'Drop student',
  color: '#dc2626',
  icon: <PersonOffIcon fontSize="small" />,
  onClick: (r) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Drop ${fullName(r) || 'this student'}? This stops all reminders and moves them to Drop Candidates.`)) return Promise.resolve();
    const reason = window.prompt('Reason for drop (optional):') || '';
    return admissionsApi.drop(r.id, reason);
  },
};

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
      dropAction,
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
      dropAction,
    ]}
  />
);

export const DropCandidatesPage = () => (
  <AdmissionsList
    title="Drop Candidates"
    subtitle="Students who were dropped. No reminders fire against them. They stay here for record/audit."
    statusFilter="dropped"
    showFees
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
