import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, IconButton, Chip, CircularProgress, Tooltip, Snackbar, Alert,
  TextField, MenuItem, InputAdornment, Autocomplete,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { admissionsApi, leadsApi, programsApi, usersApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';
import ConfigureFeeOffer from '../../components/ConfigureFeeOffer/ConfigureFeeOffer';
import VerifyAdmissionDialog from '../../components/VerifyAdmissionDialog/VerifyAdmissionDialog';
import DateRangePicker from '../../components/DatePicker/DatePicker';
import { onNotification } from '../../lib/socket';
import { fmtDate } from './utils';
import './Accounts.css';

// Local YYYY-MM-DD (avoids the UTC shift toISOString() would introduce for
// users east of UTC — our tenants are in Asia/Kolkata).
const ymd = (d) => {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

const EMPTY_FILTERS = {
  search: '', programId: '', ownerId: '', leadOwnerId: '', state: '',
  from: '', to: '', datePreset: '', // datePreset is UI-only
};

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
  // Filter state. `filters` drives the API query (server-side filtering).
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Dropdown option sources.
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const setFilter = useCallback((k, v) => setFilters((f) => ({ ...f, [k]: v })), []);
  const activeFilterCount = useMemo(
    () => ['search', 'programId', 'ownerId', 'leadOwnerId', 'state', 'from'].filter((k) => filters[k]).length,
    [filters],
  );
  // Lead currently being inspected in the read-only modal. Hydrated from
  // leadsApi.get on click so AddNewLead has every field to render.
  const [viewLead, setViewLead] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  // The lead currently being configured in the ConfigureFeeOffer modal.
  // null = modal closed.
  const [offerLeadId, setOfferLeadId] = useState(null);
  // The admission currently being verified (Approve / Reject modal).
  const [verifyAdmissionId, setVerifyAdmissionId] = useState(null);

  const openViewLead = useCallback(async (leadId) => {
    if (!leadId) return;
    setLoadingView(true);
    try {
      const r = await leadsApi.get(leadId);
      setViewLead(r?.data || null);
    } catch {
      setViewLead(null);
    } finally {
      setLoadingView(false);
    }
  }, []);

  // Toast for the share-link copy / failure feedback. Kept here (parent)
  // instead of the row so multiple rapid clicks don't stack snackbars.
  const [toast, setToast] = useState(null);

  // One-click share-link: mint a fresh 24h token, copy it, toast. The
  // payment account is taken from the lead's saved fee offer (set in the
  // Configure / Reconfigure dialog), so there's no per-share picker here.
  const copyShareLink = useCallback(async (leadId) => {
    if (!leadId) return;
    try {
      const r = await admissionsApi.generateShareLink(leadId);
      const token = r?.data?.token;
      if (!token) throw new Error('No token returned');
      const url = `${window.location.origin}/apply/${token}`;
      try {
        await navigator.clipboard.writeText(url);
        setToast({ severity: 'success', text: `Public link copied. Valid for 24 hours.\n${url}` });
      } catch {
        setToast({ severity: 'info', text: `Copy this link manually: ${url}` });
      }
    } catch (e) {
      setToast({ severity: 'error', text: e?.message || 'Could not generate share link' });
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admissionsApi.pendingAdmissions({
        search: filters.search,
        programId: filters.programId,
        ownerId: filters.ownerId,
        leadOwnerId: filters.leadOwnerId,
        state: filters.state,
        from: filters.from,
        to: filters.to,
      });
      setRows(r?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce so typing in the search box (or rapid filter changes) doesn't
  // fire a request per keystroke. reload already depends on `filters`.
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  // Load dropdown option sources once. Failures degrade gracefully to empty
  // dropdowns (the rest of the filters still work).
  useEffect(() => {
    (async () => {
      try {
        const [pr, us] = await Promise.all([
          programsApi.list().catch(() => ({ data: [] })),
          usersApi.options().catch(() => ({ data: [] })),
        ]);
        setPrograms(pr?.data || []);
        // Only counsellors/managers/admins are meaningful owners; keep all
        // active users and let the label carry the role for disambiguation.
        setUsers((us?.data || []).filter((u) => u?.is_active !== false));
      } catch { /* dropdowns stay empty */ }
    })();
  }, []);

  // Date-range presets. 'last7' → converted/created in the last 7 days.
  // 'thisMonth' → since the 1st of the current month. 'custom' opens the
  // DateRangePicker. Selecting a preset sets from/to (YYYY-MM-DD).
  const applyDatePreset = useCallback((preset) => {
    const now = new Date();
    if (preset === 'last7') {
      const from = new Date(now); from.setDate(now.getDate() - 6); // inclusive 7-day window
      setFilters((f) => ({ ...f, datePreset: 'last7', from: ymd(from), to: ymd(now) }));
    } else if (preset === 'thisMonth') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilters((f) => ({ ...f, datePreset: 'thisMonth', from: ymd(from), to: ymd(now) }));
    } else {
      // '' → clear the date range
      setFilters((f) => ({ ...f, datePreset: '', from: '', to: '' }));
    }
  }, []);

  const clearAllFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  // Live refresh on three signals:
  //   1. Socket: BE emits 'admission.pending' whenever a lead converts
  //      OR the student submits the public form. Both fire-paths route
  //      through admissions/service.notifyPendingAdmission so the same
  //      listener catches both. Without this the page only updated on
  //      focus, which the comment used to claim but never actually did.
  //   2. Window focus: covers cases where the socket dropped silently.
  //   3. Lightweight 30s poll: belt-and-suspenders.
  useEffect(() => {
    const offSocket = onNotification((evt) => {
      if (evt?.type === 'admission.pending') reload();
    });
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const t = setInterval(reload, 30_000);
    return () => {
      try { offSocket?.(); } catch { /* ignore */ }
      window.removeEventListener('focus', onFocus);
      clearInterval(t);
    };
  }, [reload]);

  return (
    <div className="accounts-page">
      <div className="accounts-page-head">
        <div>
          <div className="accounts-page-title">Pending Admissions</div>
          <div className="accounts-page-subtitle">
            Converted leads waiting for the admission form, admissions
            awaiting verification, and students currently on break.
            Newest first.
          </div>
        </div>
        <Tooltip title="Refresh">
          <IconButton onClick={reload}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* ---------------- Filter bar ---------------- */}
      <div
        className="accounts-filter-bar"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}
      >
        <TextField
          size="small"
          placeholder="Search name, email, phone"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
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
          value={programs.find((p) => p.id === filters.programId) || null}
          onChange={(_e, opt) => setFilter('programId', opt?.id || '')}
          sx={{ minWidth: 220 }}
          renderInput={(params) => <TextField {...params} label="Course" placeholder="All courses" />}
        />

        <Autocomplete
          size="small"
          options={users}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={users.find((u) => u.id === filters.ownerId) || null}
          onChange={(_e, opt) => setFilter('ownerId', opt?.id || '')}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} label="Owner" placeholder="All owners" />}
        />

        <Autocomplete
          size="small"
          options={users}
          getOptionLabel={(o) => o?.name || ''}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={users.find((u) => u.id === filters.leadOwnerId) || null}
          onChange={(_e, opt) => setFilter('leadOwnerId', opt?.id || '')}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} label="Lead Owner" placeholder="All lead owners" />}
        />

        <TextField
          select size="small" label="State" value={filters.state}
          onChange={(e) => setFilter('state', e.target.value)} sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All states</MenuItem>
          <MenuItem value="lead">No admission form</MenuItem>
          <MenuItem value="pending_approval">Awaiting verification</MenuItem>
          <MenuItem value="on_break">On Break</MenuItem>
        </TextField>

        {/* Date presets */}
        <TextField
          select size="small" label="Converted" value={filters.datePreset}
          onChange={(e) => applyDatePreset(e.target.value)} sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Any time</MenuItem>
          <MenuItem value="last7">Last 7 days</MenuItem>
          <MenuItem value="thisMonth">This month</MenuItem>
        </TextField>

        {/* Custom date range picker (returns {startDate,endDate}) */}
        <DateRangePicker
          onApply={(r) => setFilters((f) => ({
            ...f,
            datePreset: '',
            from: ymd(r?.startDate) || '',
            to: ymd(r?.endDate) || '',
          }))}
        />

        {(filters.from || filters.to) && (
          <Chip
            size="small"
            label={`${filters.from || '…'} → ${filters.to || '…'}`}
            onDelete={() => applyDatePreset('')}
            sx={{ height: 26 }}
          />
        )}

        {activeFilterCount > 0 && (
          <Button
            size="small" startIcon={<ClearIcon />} onClick={clearAllFilters}
            sx={{ textTransform: 'none', color: '#6b7280' }}
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="accounts-table-card">
        {loading ? (
          <div className="accounts-empty"><CircularProgress size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="accounts-empty">
            {activeFilterCount > 0 || filters.from || filters.to
              ? 'No pending admissions match these filters.'
              : '🎉 All clear. No leads are waiting on admission.'}
          </div>
        ) : (
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Converted At</th>
                <th>Student</th>
                <th>Course</th>
                <th>Owner</th>
                <th>Lead Owner</th>
                <th>State</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PendingRow
                  key={`${r.source_kind}-${r.source_id}`}
                  row={r}
                  onChanged={reload}
                  navigate={navigate}
                  onView={openViewLead}
                  busyView={loadingView}
                  onCopyLink={copyShareLink}
                  onConfigureOffer={(leadId) => setOfferLeadId(leadId)}
                  onVerify={(admissionId) => setVerifyAdmissionId(admissionId)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Read-only Lead modal. AddNewLead with viewOnly=true reuses the
          existing edit form but disables every input and hides Save. */}
      <AddNewLead
        open={Boolean(viewLead)}
        onClose={() => setViewLead(null)}
        leadData={viewLead}
        viewOnly
      />

      {/* Configure / reconfigure the per-lead fee plan. Saving here is
          what flips the row's has_fee_offer flag and unlocks the
          "Copy link" + "Start admission form" buttons. */}
      <ConfigureFeeOffer
        open={Boolean(offerLeadId)}
        leadId={offerLeadId}
        onClose={() => setOfferLeadId(null)}
        onSaved={() => reload()}
      />

      {/* Verify / Approve / Reject. Replaces the old one-click approve so
          accounts can confirm what the student submitted before flipping
          the status. On Reject, the lead falls back into the queue with
          a fresh-link CTA. */}
      <VerifyAdmissionDialog
        open={Boolean(verifyAdmissionId)}
        admissionId={verifyAdmissionId}
        onClose={() => setVerifyAdmissionId(null)}
        onChanged={() => reload()}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast && (
          <Alert severity={toast.severity} sx={{ whiteSpace: 'pre-line', maxWidth: 520 }}>
            {toast.text}
          </Alert>
        )}
      </Snackbar>
    </div>
  );
};

const PendingRow = ({ row, onChanged, navigate, onView, busyView, onCopyLink, onConfigureOffer, onVerify }) => {
  const isLead = row.source_kind === 'lead';
  const isOnBreak = row.source_kind === 'admission' && row.admission_status === 'on_break';

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
      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.lead_owner_name || '—'}</td>
      <td>
        {isLead ? (
          <Chip
            size="small"
            label="No admission form"
            sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        ) : isOnBreak ? (
          <Tooltip title={row.break_reason || 'Student is currently on break.'}>
            <Chip
              size="small"
              label="On Break"
              sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 600, height: 22, fontSize: 11 }}
            />
          </Tooltip>
        ) : (
          <Chip
            size="small"
            label="Awaiting verification"
            sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 600, height: 22, fontSize: 11 }}
          />
        )}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {row.lead_id && (
          <Tooltip title="View lead details">
            <span>
              <Button
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => onView?.(row.lead_id)}
                disabled={busyView}
                sx={{ textTransform: 'none', mr: 1, color: 'var(--primary)' }}
              >
                View lead
              </Button>
            </span>
          </Tooltip>
        )}
        {isLead ? (
          <>
            {/* Three-state CTA group for converted-but-no-admission leads:
                  • No offer yet  → only "Configure offer" is shown.
                  • Offer exists  → "Reconfigure" + "Copy link" + "Start admission form".
                Backend refuses to mint a share-link without an offer
                anyway; gating the UI here just removes a footgun. */}
            {!row.has_fee_offer ? (
              <Tooltip title="Set the fees + installment plan for this lead before sharing a link.">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<TuneIcon />}
                  onClick={() => onConfigureOffer?.(row.lead_id)}
                  sx={{ textTransform: 'none', bgcolor: '#E53935' }}
                >
                  Configure offer
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Edit the fee offer for this lead.">
                  <span>
                    <Button
                      size="small"
                      startIcon={<TuneIcon />}
                      onClick={() => onConfigureOffer?.(row.lead_id)}
                      sx={{ textTransform: 'none', mr: 1, color: '#475569' }}
                    >
                      Reconfigure
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Generate a 24h public link to share with the student. Uses the payment account set in the offer.">
                  <span>
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => onCopyLink?.(row.lead_id)}
                      sx={{ textTransform: 'none', mr: 1, color: 'var(--primary)' }}
                    >
                      Copy link
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AssignmentIndIcon />}
                  onClick={() => navigate(`/accounts/new-admission/${row.lead_id}`)}
                  sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
                >
                  Start admission form
                </Button>
              </>
            )}
          </>
        ) : isOnBreak ? (
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
              onClick={async () => {
                await admissionsApi.resume(row.admission_id);
                onChanged?.();
              }}
              sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
            >
              Resume
            </Button>
          </>
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
              onClick={() => onVerify?.(row.admission_id)}
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
