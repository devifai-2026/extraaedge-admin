import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHref, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button, IconButton, TextField, InputAdornment, Tooltip, Autocomplete, MenuItem,
  Chip, LinearProgress, Pagination, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { admissionsApi, programsApi, usersApi } from '../../lib/endpoints';
import { fullName, fmtDate, fmtMoney } from './utils';
import { isRole, ROLES } from '../../lib/rbac';
import './AdmissionsList.css';

// ── Status look & labels ────────────────────────────────────────────────────
const STATUS_META = {
  pending_approval: { label: 'Pending', fg: '#b45309', bg: '#fef3c7' },
  attending:        { label: 'Attending', fg: '#15803d', bg: '#dcfce7' },
  on_break:         { label: 'On Break', fg: '#c2410c', bg: '#ffedd5' },
  completed:        { label: 'Completed', fg: '#1d4ed8', bg: '#dbeafe' },
  rejected:         { label: 'Rejected', fg: '#b91c1c', bg: '#fee2e2' },
  dropped:          { label: 'Dropped', fg: '#475569', bg: '#e2e8f0' },
};
const STATUS_TABS = ['', 'pending_approval', 'attending', 'on_break', 'completed', 'rejected'];

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 50;

// Deterministic soft colour per name, so a student keeps their avatar colour.
const AVATAR_COLORS = [
  ['#e0e7ff', '#3730a3'], ['#dcfce7', '#166534'], ['#fef3c7', '#92400e'],
  ['#fce7f3', '#9d174d'], ['#e0f2fe', '#075985'], ['#ede9fe', '#5b21b6'],
  ['#ffedd5', '#9a3412'], ['#ccfbf1', '#115e59'],
];
const avatarFor = (name) => {
  const s = String(name || '?');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const [bg, fg] = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const initials = s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return { bg, fg, initials };
};
const Avatar = ({ name, small }) => {
  const a = avatarFor(name);
  return <span className={`adm-avatar${small ? ' sm' : ''}`} style={{ background: a.bg, color: a.fg }}>{a.initials}</span>;
};

// "Today" / "Yesterday" / "5 days ago" / weekday — the sub-line under the date.
const relDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff <= 30) return `${diff} days ago`;
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
};

export const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status || '—', fg: '#475569', bg: '#f1f5f9' };
  return <span className="adm-status" style={{ color: m.fg, background: m.bg }}><i />{m.label}</span>;
};

// Filters live in the URL (so Back, refresh and shared links keep them) and are
// mirrored per page in sessionStorage (so leaving via the sidebar and coming
// back restores them too). Keys are short to keep the URL readable.
const FILTER_KEYS = ['q', 'program', 'counsellor', 'center', 'status', 'onboarding', 'from', 'to'];
const storageKey = (path) => `adm-filters:${path}`;
const saveFilters = (path, sp) => {
  try { sessionStorage.setItem(storageKey(path), sp.toString()); } catch { /* storage unavailable */ }
};

// One component, six list pages — page-specific behaviour is fully driven by
// props (status lock, title, actions).
//
// Props:
//   title       — page heading
//   subtitle    — optional description under heading
//   statusFilter— locks the page to one status (hides the status tabs)
//   monthScope  — restricts to the current calendar month
//   showCreate  — adds a "New Admission" button → /accounts/new-admission
//   actions     — array of { label, color, icon, when(row), onClick(row) }
//   showFees    — adds Fees / Paid / Pending columns (money roles only)
//   showOnboarding — adds the LMS "Onboarding" column + filter
const AdmissionsList = ({
  title, subtitle, statusFilter, monthScope, showCreate, actions,
  showFees: showFeesProp, showOnboarding,
}) => {
  // Fee columns are course money — withheld from roles without money access
  // whatever the caller sets. The server nulls the values for them too.
  const showFees = showFeesProp && isRole(ROLES.SUPER_ADMIN, ROLES.ACCOUNT_MANAGER);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const get = (k) => searchParams.get(k) || '';

  const page = Math.max(1, Number(get('page')) || 1);
  const size = PAGE_SIZES.includes(Number(get('size'))) ? Number(get('size')) : DEFAULT_PAGE_SIZE;

  // Write a patch into the URL (replace, not push — filter tweaks shouldn't
  // fill the Back history) and mirror it to sessionStorage.
  const setParams = (patch, { resetPage = true } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v == null) next.delete(k); else next.set(k, String(v));
      });
      if (resetPage) next.delete('page');
      saveFilters(location.pathname, next);
      return next;
    }, { replace: true });
  };

  // Came back via the sidebar (URL has no params)? Restore this page's filters.
  useEffect(() => {
    if (location.search) return;
    let saved = '';
    try { saved = sessionStorage.getItem(storageKey(location.pathname)) || ''; } catch { /* ignore */ }
    if (saved) setSearchParams(new URLSearchParams(saved), { replace: true });
    // Only on arrival at this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Search box: local for instant typing, pushed to the URL after a pause.
  const urlQ = get('q');
  const [qInput, setQInput] = useState(urlQ);
  const lastPushedQ = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastPushedQ.current) { lastPushedQ.current = urlQ; setQInput(urlQ); }
  }, [urlQ]);
  useEffect(() => {
    const v = qInput.trim();
    if (v === urlQ) return undefined;
    const t = setTimeout(() => { lastPushedQ.current = v; setParams({ q: v }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  // Server query — built only from the URL + page props.
  const query = useMemo(() => {
    const p = { page, limit: size };
    const status = statusFilter || searchParams.get('status');
    if (status) p.status = status;
    const map = { q: 'q', program: 'program_id', center: 'center_id', counsellor: 'guided_by_counsellor_id' };
    Object.entries(map).forEach(([k, api]) => { const v = searchParams.get(k); if (v) p[api] = v; });
    if (showOnboarding && searchParams.get('onboarding')) p.onboarding = searchParams.get('onboarding');
    if (monthScope) {
      const now = new Date();
      p.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
      if (searchParams.get('from')) p.date_from = searchParams.get('from');
      if (searchParams.get('to')) p.date_to = searchParams.get('to');
    }
    return p;
  }, [searchParams, page, size, statusFilter, monthScope, showOnboarding]);
  const queryKey = JSON.stringify(query);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const r = await admissionsApi.list(JSON.parse(queryKey));
        if (!alive) return;
        const data = r?.data || [];
        setRows(data);
        setTotal(r?.meta?.total ?? data.length);
      } catch {
        if (alive) { setRows([]); setTotal(0); }
      } finally {
        if (alive) { setLoading(false); setLoadedOnce(true); }
      }
    })();
    return () => { alive = false; };
  }, [queryKey, tick]);

  // An action (approve / drop …) emptied the last page → step back one.
  const pageCount = Math.max(1, Math.ceil(total / size));
  useEffect(() => {
    if (!loading && page > pageCount) setParams({ page: pageCount }, { resetPage: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page, pageCount]);

  // Dropdown sources. Failures degrade to empty dropdowns.
  const [programs, setPrograms] = useState([]);
  const [centers, setCenters] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const [pr, ce, us] = await Promise.all([
        programsApi.list().catch(() => ({ data: [] })),
        admissionsApi.centers.list().catch(() => ({ data: [] })),
        usersApi.options().catch(() => ({ data: [] })),
      ]);
      setPrograms(pr?.data || []);
      setCenters(ce?.data || []);
      setUsers((us?.data || []).filter((u) => u?.is_active !== false));
    })();
  }, []);

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || '…';
  const ONBOARDING_LABEL = { no_account: 'No login issued', never_used: 'Never signed in', using: 'Using platform' };
  const activeChips = [
    get('q') && { key: 'q', label: `Search: “${get('q')}”` },
    get('program') && { key: 'program', label: `Course: ${nameOf(programs, get('program'))}` },
    get('counsellor') && { key: 'counsellor', label: `Counsellor: ${nameOf(users, get('counsellor'))}` },
    get('center') && { key: 'center', label: `Center: ${nameOf(centers, get('center'))}` },
    !statusFilter && get('status') && { key: 'status', label: `Status: ${STATUS_META[get('status')]?.label || get('status')}` },
    showOnboarding && get('onboarding') && { key: 'onboarding', label: `Onboarding: ${ONBOARDING_LABEL[get('onboarding')]}` },
    !monthScope && get('from') && { key: 'from', label: `From ${fmtDate(get('from'))}` },
    !monthScope && get('to') && { key: 'to', label: `To ${fmtDate(get('to'))}` },
  ].filter(Boolean);

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    FILTER_KEYS.forEach((k) => next.delete(k));
    next.delete('page');
    saveFilters(location.pathname, next);
    setSearchParams(next, { replace: true });
  };

  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const colCount = 8 + (showOnboarding ? 1 : 0) + (showFees ? 3 : 0) + (actions?.length ? 1 : 0);

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">{title}</h1>
          {subtitle && <div className="adm-subtitle">{subtitle}</div>}
        </div>
        <div className="adm-head-right">
          <div className="adm-stat">
            <span className="adm-stat-value">
              {loadedOnce ? total.toLocaleString('en-IN') : <Skeleton width={48} />}
            </span>
            <span className="adm-stat-label">{activeChips.length ? 'Matching' : 'Admissions'}</span>
          </div>
          {showCreate && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddIcon />}
              onClick={() => navigate('/accounts/new-admission')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', px: 2.2, py: 1, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' } }}
            >
              New Admission
            </Button>
          )}
        </div>
      </header>

      {!statusFilter && (
        <div className="adm-tabs" role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              role="tab"
              className="adm-tab"
              aria-selected={get('status') === s}
              onClick={() => setParams({ status: s })}
            >
              {s && <span className="adm-tab-dot" style={{ background: STATUS_META[s].fg }} />}
              {s ? STATUS_META[s].label : 'All'}
            </button>
          ))}
        </div>
      )}

      <section className="adm-filters">
        <div className="adm-filter-grid">
          <TextField
            className="adm-search"
            size="small"
            placeholder="Search name, email or phone"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                endAdornment: qInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => setQInput('')}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Autocomplete
            size="small"
            options={programs}
            getOptionLabel={(o) => o?.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={programs.find((p) => p.id === get('program')) || null}
            onChange={(_e, opt) => setParams({ program: opt?.id || '' })}
            renderInput={(params) => <TextField {...params} label="Course" placeholder="All courses" />}
          />
          <Autocomplete
            size="small"
            options={users}
            getOptionLabel={(o) => o?.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={users.find((u) => u.id === get('counsellor')) || null}
            onChange={(_e, opt) => setParams({ counsellor: opt?.id || '' })}
            renderInput={(params) => <TextField {...params} label="Counsellor" placeholder="All counsellors" />}
          />
          <Autocomplete
            size="small"
            options={centers}
            getOptionLabel={(o) => o?.name || ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={centers.find((c) => c.id === get('center')) || null}
            onChange={(_e, opt) => setParams({ center: opt?.id || '' })}
            renderInput={(params) => <TextField {...params} label="Center" placeholder="All centers" />}
          />
        </div>

        <div className="adm-filter-row2">
          {!monthScope && (
            <>
              <TextField
                type="date" size="small" label="Admitted from"
                value={get('from')}
                onChange={(e) => setParams({ from: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: get('to') || undefined } }}
                sx={{ width: 170 }}
              />
              <TextField
                type="date" size="small" label="Admitted to"
                value={get('to')}
                onChange={(e) => setParams({ to: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: get('from') || undefined } }}
                sx={{ width: 170 }}
              />
            </>
          )}
          {showOnboarding && (
            <TextField
              select size="small" label="Onboarding" value={get('onboarding')}
              onChange={(e) => setParams({ onboarding: e.target.value })} sx={{ width: 190 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="no_account">No login issued</MenuItem>
              <MenuItem value="never_used">Never signed in</MenuItem>
              <MenuItem value="using">Using platform</MenuItem>
            </TextField>
          )}
          <div className="adm-chips">
            {activeChips.map((c) => (
              <Chip
                key={c.key}
                size="small"
                label={c.label}
                onDelete={() => { if (c.key === 'q') setQInput(''); setParams({ [c.key]: '' }); }}
                sx={{ fontWeight: 500, bgcolor: 'var(--adm-accent-soft)', color: 'var(--adm-ink)', borderRadius: '8px' }}
              />
            ))}
          </div>
          {activeChips.length > 0 && (
            <Button size="small" startIcon={<FilterAltOffIcon fontSize="small" />} onClick={() => { setQInput(''); clearAll(); }}
              sx={{ textTransform: 'none', color: 'var(--adm-muted)', fontWeight: 600 }}
            >
              Clear all
            </Button>
          )}
        </div>
      </section>

      <section className={`adm-card${loading && loadedOnce ? ' is-loading' : ''}`}>
        {loading && loadedOnce && <LinearProgress className="adm-progress" sx={{ height: 2 }} />}
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Admitted</th>
                <th>Student</th>
                <th>Course</th>
                <th>Counsellor</th>
                <th>Center</th>
                <th>Mode</th>
                <th>Status</th>
                {showOnboarding && <th>Onboarding</th>}
                {showFees && <th className="num">Fees</th>}
                {showFees && <th className="num">Paid</th>}
                {showFees && <th className="num">Pending</th>}
                <th>Contact</th>
                {actions?.length > 0 && <th className="num">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {!loadedOnce && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <td key={j}><Skeleton variant="text" width={j === 1 ? 180 : 90} /></td>
                  ))}
                </tr>
              ))}
              {loadedOnce && rows.map((r) => (
                <AdmissionRow
                  key={r.id}
                  row={r}
                  actions={actions}
                  showFees={showFees}
                  showOnboarding={showOnboarding}
                  onChanged={reload}
                />
              ))}
            </tbody>
          </table>
        </div>

        {loadedOnce && !loading && rows.length === 0 && (
          <div className="adm-empty">
            <div className="adm-empty-icon"><SchoolOutlinedIcon /></div>
            <h3>{activeChips.length ? 'No admissions match these filters' : 'No admissions yet'}</h3>
            <p>{activeChips.length ? 'Try widening the date range or removing a filter.' : 'New admissions will show up here.'}</p>
            {activeChips.length > 0 && (
              <Button variant="outlined" size="small" onClick={() => { setQInput(''); clearAll(); }} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {loadedOnce && total > 0 && (
          <footer className="adm-foot">
            <div className="adm-foot-info">
              <span>Showing <b>{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}</b> of <b>{total.toLocaleString('en-IN')}</b></span>
              <TextField
                select size="small" value={size}
                onChange={(e) => setParams({ size: Number(e.target.value) === DEFAULT_PAGE_SIZE ? '' : e.target.value })}
                sx={{ '& .MuiInputBase-input': { py: 0.6, fontSize: 13 } }}
              >
                {PAGE_SIZES.map((n) => <MenuItem key={n} value={n}>{n} / page</MenuItem>)}
              </TextField>
            </div>
            {pageCount > 1 && (
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_e, p) => setParams({ page: p === 1 ? '' : p }, { resetPage: false })}
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
                sx={{ '& .Mui-selected': { bgcolor: 'var(--adm-ink) !important', color: '#fff' } }}
              />
            )}
          </footer>
        )}
      </section>
    </div>
  );
};

// Is this student REALLY onboarded?
//
//   No login    — course-confirm has not been run; no LMS account exists.
//   Not used    — an account exists but last_login_at is NULL: the student has
//                 NEVER signed in. The one someone needs to call.
//   Using it    — last_login_at is set (only a real password login stamps it).
//
// Shows the date, not just a tick: "once in August" ≠ "yesterday".
const OnboardingCell = ({ row }) => {
  const created = row.student_account_created_at;
  const lastLogin = row.student_last_login_at;
  const state = !created
    ? { label: 'No login', fg: '#b91c1c', bg: '#fee2e2', hint: 'No LMS account yet — run Confirm Course' }
    : !lastLogin
      ? { label: 'Never signed in', fg: '#b45309', bg: '#fef3c7', hint: 'Account created but the student has never logged in' }
      : { label: 'Using platform', fg: '#15803d', bg: '#dcfce7', hint: `Last signed in ${fmtDate(lastLogin)}` };
  return (
    <div title={state.hint}>
      <span className="adm-status" style={{ color: state.fg, background: state.bg }}><i />{state.label}</span>
      {lastLogin && <div className="adm-date-sub">{fmtDate(lastLogin)}</div>}
    </div>
  );
};

const AdmissionRow = ({ row, actions, showFees, showOnboarding, onChanged }) => {
  // Basename-aware URL of the detail page; rows open it in a NEW TAB so the
  // list (with its filters and page) stays exactly where it was.
  const href = useHref(`/accounts/admission/${row.id}`);
  const openDetail = () => window.open(href, '_blank', 'noopener');
  const [detail, setDetail] = useState(null);

  // Fees mode: the list endpoint doesn't compute paid_till_date — fetch /:id.
  useEffect(() => {
    if (!showFees) return undefined;
    let alive = true;
    admissionsApi.get(row.id)
      .then((r) => { if (alive) setDetail(r?.data); })
      .catch(() => { if (alive) setDetail(null); });
    return () => { alive = false; };
  }, [showFees, row.id]);

  const paid = Number(detail?.paid_till_date ?? 0);
  const pending = Number(detail?.pending_fees ?? row.total_fees ?? 0);
  const name = fullName(row);
  const phone = row.whatsapp_number || '';
  const waDigits = phone.replace(/\D/g, '');
  const waLink = waDigits.length >= 10 ? `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}` : null;

  return (
    <tr
      className="adm-row"
      tabIndex={0}
      onClick={() => {
        // Selecting text (to copy a phone/email) shouldn't open a tab.
        if (window.getSelection?.().toString()) return;
        openDetail();
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') openDetail(); }}
    >
      <td>
        <div className="adm-date">{fmtDate(row.admission_date)}</div>
        <div className="adm-date-sub">{relDay(row.admission_date)}</div>
      </td>
      <td>
        <div className="adm-student">
          <Avatar name={name} />
          <div style={{ minWidth: 0 }}>
            <a className="adm-name" href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              {name}
              <OpenInNewIcon className="adm-open" sx={{ fontSize: 13 }} />
            </a>
            <div className="adm-email">{row.email || '—'}</div>
          </div>
        </div>
      </td>
      <td><div className="adm-course" title={row.program_name || ''}>{row.program_name || <span className="adm-muted">—</span>}</div></td>
      <td>
        {row.guided_by_counsellor_name
          ? <span className="adm-person"><Avatar name={row.guided_by_counsellor_name} small />{row.guided_by_counsellor_name}</span>
          : <span className="adm-muted">—</span>}
      </td>
      <td>{row.center_name || <span className="adm-muted">—</span>}</td>
      <td>{row.mode_of_training ? <span className="adm-mode">{row.mode_of_training}</span> : <span className="adm-muted">—</span>}</td>
      <td><StatusBadge status={row.status} /></td>
      {showOnboarding && <td><OnboardingCell row={row} /></td>}
      {showFees && <td className="num">₹ {fmtMoney(row.total_fees)}</td>}
      {showFees && <td className="num">₹ {fmtMoney(paid)}</td>}
      {showFees && <td className="num">₹ {fmtMoney(pending)}</td>}
      <td>
        {phone ? (
          <span className="adm-contact">
            {phone}
            {waLink && (
              <Tooltip title="Open WhatsApp">
                <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Open WhatsApp">
                  <WhatsAppIcon sx={{ fontSize: 16 }} />
                </a>
              </Tooltip>
            )}
          </span>
        ) : <span className="adm-muted">—</span>}
      </td>
      {actions?.length > 0 && (
        <td className="num" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions.filter((a) => !a.when || a.when(row)).map((a) => (
            <Tooltip key={a.label} title={a.label}>
              <span>
                <IconButton
                  size="small"
                  onClick={async () => { await a.onClick(row); onChanged?.(); }}
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
    showOnboarding
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
