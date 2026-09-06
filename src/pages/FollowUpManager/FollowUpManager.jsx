// Follow-up Manager page — fully API-bound.
//
//   GET /follow-ups?date=YYYY-MM-DD&status=&assigned_user_id=&q=…
//                                                → list for the selected day
//   GET /follow-ups/calendar?date_from&date_to    → per-day counts for the
//                                                   calendar's status dots
//
// Calendar shows up to 3 dots under each day: planned (amber), done (green),
// missed (red). Clicking a date filters the right-pane list.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IconButton, Box, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
  TextField, InputAdornment, Chip, CircularProgress, Autocomplete,
  Collapse, Table, TableBody, TableCell, TableHead, TableRow, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InsightsIcon from '@mui/icons-material/Insights';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { followUpsApi, usersApi, leadsApi } from '../../lib/endpoints';
import AddNewLead from '../../components/AddNewLead/AddNewLead';
import { auth } from '../../lib/endpoints';
import { isRole, ROLES, LEAD_OWNER_ROLES, LEAD_OWNER_ROLES_PARAM } from '../../lib/rbac';
import { useDropdown } from '../../lib/useDropdowns';
import { colors } from '../../theme/colors';
import './FollowUpManager.css';

// Mirrors LeadPool's rule: super_admin / branch_manager / sales_manager may
// edit any lead they can open; everyone else only the leads they own. The
// server re-checks this on save (modules/leads/service.js#updateLead).
const canEditLead = (lead) => {
  if (!lead) return false;
  if (isRole(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER, ROLES.SALES_MANAGER)) return true;
  const me = auth.getUser()?.id;
  return Boolean(me && lead.assigned_to && lead.assigned_to === me);
};

const STATUS_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'planned', label: 'Planned',   color: '#FB8C00' },
  { key: 'done',    label: 'Done',      color: '#43A047' },
  { key: 'missed',  label: 'Missed',    color: '#E53935' },
  { key: 'cancelled', label: 'Cancelled', color: '#9E9E9E' },
];

const SORT_OPTIONS = [
  { key: 'time_asc',  label: 'Time (earliest first)' },
  { key: 'time_desc', label: 'Time (latest first)' },
  { key: 'name_asc',  label: 'Lead name (A → Z)' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

// ===== Calendar =====
function FollowupCalendar({ selectedDate, onDateSelect, dayBuckets, loading }) {
  const [view, setView] = useState({
    month: selectedDate.getMonth(),
    year:  selectedDate.getFullYear(),
  });

  const today = new Date();
  const todayStr = toDateStr(today);
  const selectedStr = toDateStr(selectedDate);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(view.year, view.month, 1).getDay();

  // Pad start; fill days; pad end so we always render 6 weeks for stable height.
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const goPrev = () => {
    setView((v) => v.month === 0 ? { month: 11, year: v.year - 1 } : { ...v, month: v.month - 1 });
  };
  const goNext = () => {
    setView((v) => v.month === 11 ? { month: 0, year: v.year + 1 } : { ...v, month: v.month + 1 });
  };
  const jumpToday = () => {
    setView({ month: today.getMonth(), year: today.getFullYear() });
    onDateSelect(today);
  };

  // Bubble months/years (3 in past, 3 in future)
  const yearChoices = useMemo(() => {
    const ty = today.getFullYear();
    return Array.from({ length: 7 }, (_, i) => ty - 3 + i);
  }, [today]);

  return (
    <div className="followup-calendar">
      <div className="calendar-title">
        <span className="calendar-icon"><CalendarMonthIcon /></span>
        Follow-up Calendar
        {loading && <CircularProgress size={14} sx={{ ml: 1 }} />}
      </div>

      <div className="calendar-nav">
        <IconButton size="small" onClick={goPrev} title="Previous month"><ChevronLeftIcon /></IconButton>
        <select
          className="calendar-month-select"
          value={view.month}
          onChange={(e) => setView({ ...view, month: Number(e.target.value) })}
        >
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          className="calendar-year-select"
          value={view.year}
          onChange={(e) => setView({ ...view, year: Number(e.target.value) })}
        >
          {yearChoices.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <IconButton size="small" onClick={goNext} title="Next month"><ChevronRightIcon /></IconButton>
        <button className="calendar-today-btn" onClick={jumpToday} title="Jump to today">Today</button>
      </div>

      <div className="calendar-grid">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className={`calendar-day-label ${d === 'Su' ? 'sunday' : ''} ${d === 'Sa' ? 'saturday' : ''}`}
          >
            {d}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="calendar-cell empty" />;
          const dateStr = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const bucket = dayBuckets.get(dateStr);
          const dow = (firstDayOfWeek + day - 1) % 7;
          const tooltip = bucket
            ? `${bucket.total} follow-up${bucket.total === 1 ? '' : 's'}${bucket.planned ? ` · ${bucket.planned} planned` : ''}${bucket.done ? ` · ${bucket.done} done` : ''}${bucket.missed ? ` · ${bucket.missed} missed` : ''}${bucket.cancelled ? ` · ${bucket.cancelled} cancelled` : ''}`
            : '';
          return (
            <Tooltip title={tooltip} arrow placement="top" key={day} disableHoverListener={!bucket}>
              <div
                className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${bucket ? 'has-event' : ''} ${dow === 0 ? 'sunday' : ''} ${dow === 6 ? 'saturday' : ''}`}
                onClick={() => onDateSelect(new Date(view.year, view.month, day))}
              >
                <span className="calendar-cell-num">{day}</span>
                {bucket && (
                  <div className="calendar-dots">
                    {bucket.planned   > 0 && <span className="calendar-dot dot-planned" />}
                    {bucket.done      > 0 && <span className="calendar-dot dot-done" />}
                    {bucket.missed    > 0 && <span className="calendar-dot dot-missed" />}
                    {bucket.cancelled > 0 && <span className="calendar-dot dot-cancelled" />}
                  </div>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <span><span className="calendar-dot dot-planned" /> Planned</span>
        <span><span className="calendar-dot dot-done" /> Done</span>
        <span><span className="calendar-dot dot-missed" /> Missed</span>
        <span><span className="calendar-dot dot-cancelled" /> Cancelled</span>
      </div>
    </div>
  );
}

// ===== Main =====
function KpiTile({ label, value, color }) {
  return (
    <div className="followup-kpi" style={{ borderTopColor: color }}>
      <div className="followup-kpi-value" style={{ color }}>{value ?? 0}</div>
      <div className="followup-kpi-label">{label}</div>
    </div>
  );
}

export default function FollowUpManager() {
  // Lead dialog opened from a follow-up / by-lead row. Previously these rows
  // deep-linked to /leadlist?focus=<id>, which yanked the user out of the
  // follow-up view (losing the selected date, filters and scroll position).
  // We now open the same AddNewLead dialog inline on this page instead.
  const [openLead, setOpenLead] = useState(null);
  const [openingLeadId, setOpeningLeadId] = useState(null);

  const openLeadDialog = async (leadId) => {
    if (!leadId || openingLeadId) return;
    setOpeningLeadId(leadId);
    try {
      const r = await leadsApi.get(leadId);
      if (r?.data) setOpenLead(r.data);
    } catch {
      /* lead may be out of scope or deleted — leave the page as-is */
    } finally {
      setOpeningLeadId(null);
    }
  };
  const sessionUser = auth.getUser() || {};
  // branch_manager is admin-like (sees their whole branch, scoped server-side),
  // so it gets the admin/all view here rather than the counsellor view.
  const isAdmin = sessionUser.role === 'super_admin' || sessionUser.role === 'branch_manager';
  const isManager = sessionUser.role === 'sales_manager';

  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState({ month: selectedDate.getMonth(), year: selectedDate.getFullYear() });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [counsellorId, setCounsellorId] = useState('');
  const [stageId, setStageId] = useState('');
  const [sort, setSort] = useState('time_asc');
  const [counsellors, setCounsellors] = useState([]);

  // Data
  const [followups, setFollowups] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calLoading, setCalLoading] = useState(false);

  // Date-range analytics (defaults: 1st of current month → today)
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [rangeFrom, setRangeFrom] = useState(toDateStr(firstOfMonth));
  const [rangeTo, setRangeTo]     = useState(toDateStr(today));
  const [analytics, setAnalytics] = useState({ totals: { planned: 0, done: 0, missed: 0, cancelled: 0, total: 0 }, by_lead: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showByLead, setShowByLead] = useState(false);

  // Anchor refs
  const [sortAnchor, setSortAnchor] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);

  // Stages dropdown for filter
  const stages = useDropdown('stages');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load counsellors for the manager / admin filter
  useEffect(() => {
    if (!isAdmin && !isManager) return;
    const loader = isManager ? usersApi.myTeam() : usersApi.list({ role: LEAD_OWNER_ROLES_PARAM, limit: 200 });
    loader
      .then((r) => setCounsellors((r?.data || []).filter((u) => LEAD_OWNER_ROLES.includes(u.role) && u.is_active !== false)))
      .catch(() => setCounsellors([]));
  }, [isAdmin, isManager]);

  const selectedDateStr = toDateStr(selectedDate);

  // Followup list for the selected day
  const reloadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date: selectedDateStr, limit: 200 };
      if (activeTab !== 'all') params.status = activeTab;
      if (counsellorId)        params.assigned_user_id = counsellorId;
      if (stageId)             params.stage_id = stageId;
      if (debouncedSearch)     params.q = debouncedSearch;
      const r = await followUpsApi.list(params);
      let rows = r?.data || [];
      // Client-side sort fallbacks
      if (sort === 'time_desc') rows = [...rows].reverse();
      if (sort === 'name_asc')  rows = [...rows].sort((a, b) => (a.lead_name || '').localeCompare(b.lead_name || ''));
      setFollowups(rows);
    } catch {
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDateStr, activeTab, counsellorId, stageId, debouncedSearch, sort]);

  useEffect(() => { reloadList(); }, [reloadList]);

  // Per-day counts for the visible calendar month
  const reloadCalendar = useCallback(async () => {
    const fromDate = new Date(calendarMonth.year, calendarMonth.month, 1);
    const toDate   = new Date(calendarMonth.year, calendarMonth.month + 1, 0, 23, 59, 59);
    setCalLoading(true);
    try {
      const params = {
        date_from: fromDate.toISOString(),
        date_to:   toDate.toISOString(),
      };
      if (counsellorId) params.assigned_user_id = counsellorId;
      const r = await followUpsApi.calendar(params);
      setCalendarData(r?.data || []);
    } catch {
      setCalendarData([]);
    } finally {
      setCalLoading(false);
    }
  }, [calendarMonth, counsellorId]);

  useEffect(() => { reloadCalendar(); }, [reloadCalendar]);

  // Range analytics for the selected From/To range
  const reloadAnalytics = useCallback(async () => {
    if (!rangeFrom || !rangeTo) return;
    setAnalyticsLoading(true);
    try {
      const from = new Date(`${rangeFrom}T00:00:00`);
      const to   = new Date(`${rangeTo}T23:59:59`);
      const params = {
        date_from: from.toISOString(),
        date_to:   to.toISOString(),
      };
      if (counsellorId) params.assigned_user_id = counsellorId;
      if (stageId)      params.stage_id = stageId;
      const r = await followUpsApi.analytics(params);
      const d = r?.data || {};
      setAnalytics({
        totals: d.totals || { planned: 0, done: 0, missed: 0, cancelled: 0, total: 0 },
        by_lead: d.by_lead || [],
      });
    } catch {
      setAnalytics({ totals: { planned: 0, done: 0, missed: 0, cancelled: 0, total: 0 }, by_lead: [] });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [rangeFrom, rangeTo, counsellorId, stageId]);

  useEffect(() => { reloadAnalytics(); }, [reloadAnalytics]);

  // Bucket lookup by YYYY-MM-DD
  const dayBuckets = useMemo(() => {
    const m = new Map();
    for (const r of calendarData) m.set(r.day, r);
    return m;
  }, [calendarData]);

  // Status counts for tabs (for the selected day). MUST come from the
  // calendar-buckets endpoint (unfiltered per-status totals for the day),
  // not from the already-filtered `followups` list — otherwise picking the
  // "Done" tab on a day that only has planned rows would show every chip
  // as 0 and hide the fact that the day has any followups at all.
  const tabCounts = useMemo(() => {
    const bucket = dayBuckets.get(selectedDateStr);
    if (!bucket) return { all: 0, planned: 0, done: 0, missed: 0, cancelled: 0 };
    return {
      all: bucket.total || 0,
      planned: bucket.planned || 0,
      done: bucket.done || 0,
      missed: bucket.missed || 0,
      cancelled: bucket.cancelled || 0,
    };
  }, [dayBuckets, selectedDateStr]);

  const onCalendarSelect = (d) => {
    setSelectedDate(d);
    setCalendarMonth({ month: d.getMonth(), year: d.getFullYear() });
  };

  return (
    <div className="followup-manager">
      <div className="followup-main">
        {/* Date-range analytics strip */}
        <div className="followup-analytics-strip">
          <div className="followup-analytics-head">
            <div className="followup-analytics-title">
              <InsightsIcon fontSize="small" />
              <span>Date-range analytics</span>
              {analyticsLoading && <CircularProgress size={12} sx={{ ml: 1 }} />}
            </div>
            <div className="followup-analytics-controls">
              <TextField
                size="small"
                type="date"
                label="From"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <Button
                size="small"
                variant="text"
                onClick={() => setShowByLead((v) => !v)}
                endIcon={showByLead ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                disabled={!analytics.by_lead.length}
              >
                By lead ({analytics.by_lead.length})
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const now = new Date();
                  setRangeFrom(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
                  setRangeTo(toDateStr(now));
                  setShowByLead(false);
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="followup-kpis">
            <KpiTile label="Total"     value={analytics.totals.total}     color="#3F51B5" />
            <KpiTile label="Planned"   value={analytics.totals.planned}   color="#FB8C00" />
            <KpiTile label="Done"      value={analytics.totals.done}      color="#43A047" />
            <KpiTile label="Missed"    value={analytics.totals.missed}    color="#E53935" />
            <KpiTile label="Cancelled" value={analytics.totals.cancelled} color="#9E9E9E" />
          </div>

          <Collapse in={showByLead} unmountOnExit>
            <div className="followup-bylead-wrap">
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Lead</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell align="right">Planned</TableCell>
                    <TableCell align="right">Done</TableCell>
                    <TableCell align="right">Missed</TableCell>
                    <TableCell align="right">Cancelled</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.by_lead.map((r) => (
                    <TableRow
                      key={r.lead_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openLeadDialog(r.lead_id)}
                    >
                      <TableCell>{r.lead_name || '—'}</TableCell>
                      <TableCell>{r.lead_phone || ''}</TableCell>
                      <TableCell>{r.lead_assigned_to_name || ''}</TableCell>
                      <TableCell align="right" sx={{ color: '#FB8C00', fontWeight: 600 }}>{r.planned}</TableCell>
                      <TableCell align="right" sx={{ color: '#43A047', fontWeight: 600 }}>{r.done}</TableCell>
                      <TableCell align="right" sx={{ color: '#E53935', fontWeight: 600 }}>{r.missed}</TableCell>
                      <TableCell align="right" sx={{ color: '#9E9E9E', fontWeight: 600 }}>{r.cancelled}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Collapse>
        </div>

        <div className="followup-header-badge">
          Follow-ups for {fmtDate(selectedDate)} ({tabCounts.all})
        </div>

        {/* Status tabs */}
        <div className="followup-tabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={`followup-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
              style={{
                color: t.color || (activeTab === t.key ? colors.primary : colors.textSecondary),
                borderBottom: activeTab === t.key ? `2px solid ${t.color || colors.primary}` : '2px solid transparent',
              }}
            >
              {t.label} ({tabCounts[t.key] ?? 0})
            </button>
          ))}
        </div>

        {/* Toolbar — search + sort + filter + refresh */}
        <div className="followup-toolbar">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search by lead name / phone / email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ minWidth: 280 }}
            />
            {(isAdmin || isManager) && (
              <Autocomplete
                size="small"
                options={[{ id: '', name: 'All counsellors' }, ...counsellors]}
                getOptionLabel={(o) => o.name || ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={counsellors.find((u) => u.id === counsellorId) || { id: '', name: 'All counsellors' }}
                onChange={(_e, opt) => setCounsellorId(opt?.id || '')}
                sx={{ minWidth: 220 }}
                renderInput={(p) => <TextField {...p} placeholder="Counsellor" />}
              />
            )}
            <Autocomplete
              size="small"
              options={[{ id: '', name: 'Any stage' }, ...(stages.data || []).filter((s) => s.is_active !== false)]}
              getOptionLabel={(o) => o.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              value={(stages.data || []).find((s) => s.id === stageId) || { id: '', name: 'Any stage' }}
              onChange={(_e, opt) => setStageId(opt?.id || '')}
              sx={{ minWidth: 200 }}
              renderInput={(p) => <TextField {...p} placeholder="Stage" />}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Sort">
              <IconButton size="small" onClick={(e) => setSortAnchor(e.currentTarget)}>
                <SwapVertIcon sx={{ color: colors.primary }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reload">
              <IconButton size="small" onClick={() => { reloadList(); reloadCalendar(); }}>
                <RefreshIcon sx={{ color: colors.primary }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="More filters">
              <IconButton size="small" onClick={(e) => setFilterAnchor(e.currentTarget)}>
                <FilterAltIcon sx={{ color: colors.primary }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.key} selected={sort === o.key} onClick={() => { setSort(o.key); setSortAnchor(null); }}>
                <ListItemText primary={o.label} primaryTypographyProps={{ fontSize: 13 }} />
              </MenuItem>
            ))}
          </Menu>

          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
            <MenuItem onClick={() => { setActiveTab('all'); setCounsellorId(''); setStageId(''); setSearch(''); setFilterAnchor(null); }}>
              <ListItemIcon><FilterAltIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Clear all filters" primaryTypographyProps={{ fontSize: 13 }} />
            </MenuItem>
          </Menu>
        </div>

        {/* List */}
        <div className="followup-cards-area">
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          )}
          {!loading && followups.length === 0 && (
            <div className="followup-empty">
              <img
                src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png"
                alt="No follow-ups"
                className="followup-empty-img"
              />
              <h3 className="followup-empty-title">No follow-ups</h3>
              <p className="followup-empty-text">
                Nothing scheduled for {fmtDate(selectedDate)}{activeTab !== 'all' && ` matching "${activeTab}"`}.
              </p>
            </div>
          )}
          {!loading && followups.map((f) => (
            <FollowupRow
              key={f.id}
              f={f}
              onChanged={() => { reloadList(); reloadCalendar(); }}
              onOpenLead={openLeadDialog}
            />
          ))}
        </div>
      </div>

      <div className="followup-right-sidebar">
        <FollowupCalendar
          selectedDate={selectedDate}
          onDateSelect={onCalendarSelect}
          dayBuckets={dayBuckets}
          loading={calLoading}
        />
      </div>

      {/* Lead dialog, opened inline from a follow-up row or the by-lead table.
          Same editability rule as the Lead Pool: managers/admins edit any
          lead, everyone else only the leads they own. */}
      <AddNewLead
        open={!!openLead}
        leadData={openLead}
        viewOnly={!canEditLead(openLead)}
        onClose={() => setOpenLead(null)}
        onSaved={() => {
          setOpenLead(null);
          // A stage/follow-up change from the dialog can move rows in/out of
          // the current day + status filter, so refresh both list and calendar.
          reloadList();
          reloadCalendar();
        }}
      />
    </div>
  );
}

// Single follow-up row in the list. Shows a coloured status dot + label,
// plus per-status actions:
//   • planned (yellow)  → reschedule, mark done, cancel
//   • missed  (red)     → reschedule, mark done, cancel
//   • done    (green)   → locked, no actions
//   • cancelled (grey)  → locked, no actions
function FollowupRow({ f, onChanged, onOpenLead }) {
  const [busy, setBusy] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);
  const [doneReason, setDoneReason] = useState('');


  const STATUS_META = {
    planned:   { color: '#FB8C00', label: 'Planned'   },
    done:      { color: '#43A047', label: 'Done'      },
    missed:    { color: '#E53935', label: 'Missed'    },
    cancelled: { color: '#9E9E9E', label: 'Cancelled' },
  };
  const meta = STATUS_META[f.status] || { color: '#9E9E9E', label: f.status };
  const canAct = f.status === 'planned' || f.status === 'missed';

  const wrap = async (op) => {
    setBusy(true);
    try { await op(); onChanged?.(); }
    catch (e) { alert(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  // Date-only comparison (ignores time of day): if today is BEFORE the
  // scheduled date, surface an "early done" warning inside the same
  // reason modal. The reason itself is always required because product
  // wants every closure to carry a remark for audit + timeline.
  const isEarlyDone = (() => {
    if (!f.next_action_datetime) return false;
    const scheduled = new Date(f.next_action_datetime);
    const today = new Date();
    const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dayKey(today) < dayKey(scheduled);
  })();

  const complete = () => {
    setDoneReason('');
    setDoneOpen(true);
  };

  const confirmDone = async () => {
    const reason = doneReason.trim();
    if (!reason) return;
    await wrap(() => followUpsApi.complete(f.id, reason));
    setDoneOpen(false);
    setDoneReason('');
  };

  const openReschedule = () => {
    // Seed the picker with the existing datetime so users can nudge it
    // forward, not re-type the whole thing.
    if (f.next_action_datetime) {
      const d = new Date(f.next_action_datetime);
      const pad = (n) => String(n).padStart(2, '0');
      setRescheduleAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setRescheduleAt('');
    }
    setRescheduleReason('');
    setRescheduleOpen(true);
  };

  const confirmReschedule = async () => {
    if (!rescheduleAt) return;
    const iso = new Date(rescheduleAt).toISOString();
    await wrap(() => followUpsApi.reschedule(f.id, iso, rescheduleReason.trim() || undefined));
    setRescheduleOpen(false);
    setRescheduleReason('');
  };

  const confirmCancel = async () => {
    await wrap(() => followUpsApi.cancel(f.id, cancelReason || undefined));
    setCancelOpen(false);
    setCancelReason('');
  };

  // Open the lead's edit dialog inline on this page (the parent owns the
  // dialog). Previously this deep-linked to /leadlist?focus=<id>.
  const openLead = () => {
    if (f.lead_id) onOpenLead?.(f.lead_id);
  };

  return (
    <>
      <div
        className="followup-row"
        onClick={openLead}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') openLead(); }}
        style={{ cursor: f.lead_id ? 'pointer' : 'default' }}
      >
        <div className="followup-row-time">
          <EventIcon fontSize="small" sx={{ color: '#888' }} />
          <span>{fmtTime(f.next_action_datetime)}</span>
        </div>
        <div className="followup-row-main">
          <div className="followup-row-lead">
            <span style={{ fontWeight: 600 }}>{f.lead_name || '—'}</span>
            <span style={{ color: '#888', fontSize: 12 }}>
              {[f.lead_phone, f.lead_program_name].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className="followup-row-meta">
            {f.lead_stage_name && <Chip size="small" label={f.lead_stage_name} sx={{ height: 22, fontSize: 11 }} />}
            {f.lead_assigned_to_name && (
              <span style={{ fontSize: 12, color: '#666' }}>
                <PersonIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.3 }} />
                {f.lead_assigned_to_name}
              </span>
            )}
            {f.comment && (
              <span style={{ fontSize: 12, color: '#444', fontStyle: 'italic', marginLeft: 8 }}>&quot;{f.comment}&quot;</span>
            )}
          </div>
        </div>
        <div className="followup-row-actions" onClick={(e) => e.stopPropagation()}>
          {/* Coloured dot + label badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '2px 10px 2px 8px', borderRadius: 999,
            background: `${meta.color}14`, color: meta.color,
            fontSize: 11, fontWeight: 700,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: meta.color,
              boxShadow: `0 0 0 3px ${meta.color}22`,
            }} />
            {meta.label}
          </span>
          {canAct && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={complete}
                disabled={busy}
                startIcon={<CheckCircleIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1b5e20',
                  borderColor: '#a5d6a7',
                  bgcolor: '#e8f5e9',
                  '&:hover': { bgcolor: '#c8e6c9', borderColor: '#43A047' },
                }}
              >
                Mark done
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={openReschedule}
                disabled={busy}
                startIcon={<ScheduleIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0d47a1',
                  borderColor: '#90caf9',
                  bgcolor: '#e3f2fd',
                  '&:hover': { bgcolor: '#bbdefb', borderColor: '#1976d2' },
                }}
              >
                Reschedule
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setCancelOpen(true)}
                disabled={busy}
                startIcon={<CancelOutlinedIcon fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#b71c1c',
                  borderColor: '#ef9a9a',
                  bgcolor: '#ffebee',
                  '&:hover': { bgcolor: '#ffcdd2', borderColor: '#E53935' },
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mark-done modal — always opens (reason is mandatory). When the
          scheduled date is still in the future we add an inline warning
          so the user doesn't accidentally close a future follow-up. The
          reason is stored on lead_followups.completion_reason and shown
          in the lead timeline, LeadCard followups view, and the Edit
          Lead form's slot grid. */}
      <Dialog open={doneOpen} onClose={() => setDoneOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark follow-up as done</DialogTitle>
        <DialogContent>
          {isEarlyDone && (
            <p style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: 6, marginTop: 0 }}>
              Heads up — this follow-up is scheduled for{' '}
              <strong>
                {f.next_action_datetime
                  ? new Date(f.next_action_datetime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'a future date'}
              </strong>
              . Marking it done now will close it early.
            </p>
          )}
          <p style={{ fontSize: 13, color: '#555', marginTop: 8, marginBottom: 8 }}>
            What happened on this follow-up? Once marked done, the row is
            locked.
          </p>
          <TextField
            label="Remark (required)"
            value={doneReason}
            onChange={(e) => setDoneReason(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={3}
            autoFocus
            placeholder="e.g. Spoke to parent, decided to enrol"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoneOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDone}
            variant="contained"
            color="success"
            disabled={busy || !doneReason.trim()}
          >
            Mark done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule modal — datetime-local input seeded with the current
          scheduled time. Confirms via POST /follow-ups/:id/reschedule.
          The remark is optional (unlike Mark Done's required one) — stored
          in lead_followups.reschedule_reason and, per reschedule, in
          lead_activities so the full reschedule history (not just the
          latest reason) shows up in the lead timeline. */}
      <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reschedule follow-up</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>New date and time</label>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              style={{
                height: 40, padding: '8px 12px',
                border: '1px solid rgba(0,0,0,0.23)', borderRadius: 4,
                fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
              }}
            />
          </div>
          <TextField
            label="Remark (optional)"
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            placeholder="e.g. Requested a callback next week"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleOpen(false)}>Cancel</Button>
          <Button onClick={confirmReschedule} variant="contained" disabled={!rescheduleAt || busy}>
            Reschedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel modal — soft-delete + notifyChain on confirm. The reason is
          optional but recommended; it's stored in lead_activities and sent
          in the socket notification payload. */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel follow-up</DialogTitle>
        <DialogContent>
          <p style={{ fontSize: 13, color: '#555', marginTop: 0 }}>
            Why are you cancelling? Your manager and their managers will be
            notified, and this reason will appear in the lead timeline.
          </p>
          <TextField
            label="Reason (required)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={3}
            autoFocus
            placeholder="e.g. Lead asked us to stop contacting them"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Back</Button>
          <Button
            onClick={confirmCancel}
            variant="contained"
            color="error"
            disabled={busy || !cancelReason.trim()}
          >
            Cancel follow-up
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
