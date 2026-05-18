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
} from '@mui/material';
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
import { followUpsApi, usersApi } from '../../lib/endpoints';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/endpoints';
import { useDropdown } from '../../lib/useDropdowns';
import { colors } from '../../theme/colors';
import './FollowUpManager.css';

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
            ? `${bucket.total} follow-up${bucket.total === 1 ? '' : 's'}${bucket.planned ? ` · ${bucket.planned} planned` : ''}${bucket.done ? ` · ${bucket.done} done` : ''}${bucket.missed ? ` · ${bucket.missed} missed` : ''}`
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
                    {bucket.planned > 0 && <span className="calendar-dot dot-planned" />}
                    {bucket.done    > 0 && <span className="calendar-dot dot-done" />}
                    {bucket.missed  > 0 && <span className="calendar-dot dot-missed" />}
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
      </div>
    </div>
  );
}

// ===== Main =====
export default function FollowUpManager() {
  const sessionUser = auth.getUser() || {};
  const isAdmin = sessionUser.role === 'super_admin';
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
    const loader = isManager ? usersApi.myTeam() : usersApi.list({ role: 'counsellor', limit: 200 });
    loader
      .then((r) => setCounsellors((r?.data || []).filter((u) => u.role === 'counsellor' && u.is_active !== false)))
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

  // Bucket lookup by YYYY-MM-DD
  const dayBuckets = useMemo(() => {
    const m = new Map();
    for (const r of calendarData) m.set(r.day, r);
    return m;
  }, [calendarData]);

  // Status counts for tabs (for the selected day)
  const tabCounts = useMemo(() => {
    const counts = { all: followups.length, planned: 0, done: 0, missed: 0, cancelled: 0 };
    for (const f of followups) {
      if (counts[f.status] !== undefined) counts[f.status] += 1;
    }
    return counts;
  }, [followups]);

  const onCalendarSelect = (d) => {
    setSelectedDate(d);
    setCalendarMonth({ month: d.getMonth(), year: d.getFullYear() });
  };

  return (
    <div className="followup-manager">
      <div className="followup-main">
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
          {!loading && followups.map((f) => <FollowupRow key={f.id} f={f} onChanged={reloadList} />)}
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
    </div>
  );
}

// Single follow-up row in the list. Shows lead, time, status, owner.
function FollowupRow({ f, onChanged }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const statusColor = {
    planned:   { bg: '#fff3e0', fg: '#e65100' },
    done:      { bg: '#e8f5e9', fg: '#1b5e20' },
    missed:    { bg: '#ffebee', fg: '#b71c1c' },
    cancelled: { bg: '#eeeeee', fg: '#555' },
  }[f.status] || { bg: '#f5f5f5', fg: '#555' };

  const complete = async () => {
    setBusy(true);
    try { await followUpsApi.complete(f.id); onChanged?.(); }
    catch (e) { alert(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  // Open the lead's edit dialog by deep-linking to LeadList with ?focus=<id>;
  // LeadList already handles the param and pops AddNewLead in edit mode.
  const openLead = () => {
    if (f.lead_id) navigate(`/leadlist?focus=${f.lead_id}`);
  };

  return (
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
            <span style={{ fontSize: 12, color: '#444', fontStyle: 'italic', marginLeft: 8 }}>"{f.comment}"</span>
          )}
        </div>
      </div>
      <div className="followup-row-actions" onClick={(e) => e.stopPropagation()}>
        <Chip
          size="small"
          label={f.status}
          sx={{ height: 22, fontSize: 11, background: statusColor.bg, color: statusColor.fg, fontWeight: 600 }}
        />
        {f.status === 'planned' && (
          <Tooltip title="Mark as done">
            <span>
              <IconButton size="small" onClick={complete} disabled={busy} sx={{ color: '#43A047' }}>
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
