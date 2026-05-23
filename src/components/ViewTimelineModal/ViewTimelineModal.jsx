import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Popover,
  Box,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import HistoryIcon from "@mui/icons-material/History";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { leadsApi } from "../../lib/endpoints";
import "./ViewTimelineModal.css";

// Map a backend timeline row to a UI category.
const categoryOf = (row) => {
  // Admission events get their own bucket so admins / accounts staff can
  // filter to them without losing the rest of the lead history.
  if (row.kind === 'admission') return 'Accounts Activity';
  if (row.kind === 'activity') {
    if (row.subtype === 'stage_changed') return 'Lead Status Journey';
    if (['assigned', 'reassign', 'auto_assign', 'refer'].includes(row.subtype)) return 'Counselor Activity';
    if (row.subtype === 'call_recording_uploaded') return 'Lead Activity';
    // Pre-admission accounts workflow (configure offer / mint share link)
    // belongs in the accounts bucket so admins can scope to it.
    if (['fee_offer_saved', 'share_link_minted'].includes(row.subtype)) return 'Accounts Activity';
    return 'Lead History';
  }
  if (row.kind === 'note') return 'Counselor Activity';
  if (row.kind === 'message' || row.kind === 'call') return 'Lead Activity';
  return 'Lead History';
};

const iconFor = (row) => {
  if (row.kind === 'admission') return <FlagIcon className="card-icon" />;
  if (row.kind === 'activity' && row.subtype === 'stage_changed') return <SwapHorizIcon className="card-icon" />;
  if (row.kind === 'activity' && ['assigned', 'reassign', 'auto_assign', 'refer'].includes(row.subtype)) return <PersonOutlineIcon className="card-icon" />;
  if (row.kind === 'note') return <ChatBubbleOutlineIcon className="card-icon" />;
  if (row.kind === 'call') return <FlagIcon className="card-icon" />;
  if (row.kind === 'message') return <FlagIcon className="card-icon" />;
  if (row.kind === 'activity') return <HistoryIcon className="card-icon" />;
  return <FlagIcon className="card-icon" />;
};

// Map UI category → CSS accent class (border, icon chip, rail dot color).
const accentClassFor = (row) => {
  const cat = categoryOf(row);
  if (cat === 'Lead Status Journey') return 'cat-status';
  if (cat === 'Counselor Activity') return 'cat-counsel';
  if (cat === 'Lead Activity') return 'cat-activity';
  if (cat === 'Accounts Activity') return 'cat-status'; // reuse the status palette
  return 'cat-history';
};

// Short uppercase tag shown under the title, e.g. "STAGE · UPDATE",
// "COUNSELOR · REASSIGN". Keeps cards scannable when there are many.
const subtitleFor = (row) => {
  if (row.kind === 'admission') {
    const map = {
      created: 'Accounts · admission created',
      status_changed: 'Accounts · status changed',
      receipt_added: 'Accounts · receipt added',
      receipt_deleted: 'Accounts · receipt removed',
      field_edited: 'Accounts · field edited',
      photo_uploaded: 'Accounts · photo uploaded',
      note_added: 'Accounts · note added',
    };
    return map[row.subtype] || `Accounts · ${row.subtype || 'event'}`;
  }
  if (row.kind === 'activity') {
    if (row.subtype === 'stage_changed') return 'Status journey';
    if (row.subtype === 'lead_created') return 'Lead history';
    if (row.subtype === 'reassign') return 'Counselor · reassign';
    if (row.subtype === 'assigned') return 'Counselor · assigned';
    if (row.subtype === 'auto_assign') return 'Counselor · auto-assign';
    if (row.subtype === 'refer') return 'Counselor · referral';
    if (row.subtype === 'call_recording_uploaded') return 'Lead activity · recording';
    if (row.subtype === 'fee_offer_saved') return 'Accounts · fee offer';
    if (row.subtype === 'share_link_minted') return 'Accounts · share link';
    return 'Lead history';
  }
  if (row.kind === 'note') return 'Counselor · note';
  if (row.kind === 'call') return `Lead activity · ${row.subtype || 'call'}`;
  if (row.kind === 'message') return `Lead activity · ${row.subtype || 'message'}`;
  return 'Event';
};

// Build the actor's initials for the footer avatar. Falls back to "?".
const initialsOf = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const titleFor = (row) => {
  if (row.kind === 'admission') {
    const map = {
      created: 'Admission created',
      status_changed: 'Admission status changed',
      receipt_added: 'Receipt added',
      receipt_deleted: 'Receipt removed',
      field_edited: 'Admission edited',
      photo_uploaded: 'Photo uploaded',
      note_added: 'Note added',
    };
    return map[row.subtype] || row.subtype || 'Admission event';
  }
  if (row.kind === 'activity') {
    if (row.subtype === 'stage_changed') return 'Stage changed';
    if (row.subtype === 'lead_created') return 'Lead created';
    if (row.subtype === 'assigned' || row.subtype === 'reassign') return 'Lead assigned';
    if (row.subtype === 'auto_assign') return 'Auto-assigned';
    if (row.subtype === 'refer') return 'Lead referred';
    if (row.subtype === 'call_recording_uploaded') return 'Call recording uploaded';
    if (row.subtype === 'fee_offer_saved') {
      return row.metadata_json?.is_update ? 'Fee offer updated' : 'Fee offer configured';
    }
    if (row.subtype === 'share_link_minted') {
      return row.metadata_json?.is_regenerate ? 'Share link regenerated' : 'Share link minted';
    }
    return row.subtype || 'Activity';
  }
  if (row.kind === 'note') return 'Note';
  if (row.kind === 'call') return `${row.subtype === 'inbound' ? 'Inbound' : 'Outbound'} call`;
  if (row.kind === 'message') return `${row.subtype || 'Message'} message`.replace(/^./, (c) => c.toUpperCase());
  return 'Event';
};

const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ''; }
};
const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};
const fmtDayKey = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch { return ''; }
};
// short label for an activity-filter menu (counts events of the given category)
const labelWithCount = (rows, cat) => `${cat} (${rows.filter((r) => categoryOf(r) === cat).length})`;

const CATEGORIES = ["Lead Activity", "Counselor Activity", "Lead History", "Lead Status Journey", "Accounts Activity"];

const ViewTimelineModal = ({ open, onClose, lead }) => {
  const [activeFilters, setActiveFilters] = useState([...CATEGORIES]);
  const [sortOrder, setSortOrder] = useState("newest");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // dropdown anchors
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [activityMenuAnchor, setActivityMenuAnchor] = useState(null);
  const [datePickerAnchor, setDatePickerAnchor] = useState(null);

  // Date range state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Day-collapse state (so the top-right chevron can collapse all days)
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseSeq, setCollapseSeq] = useState(0); // bumps to force re-init

  const reload = async () => {
    if (!lead?.id) return;
    setLoading(true);
    setError('');
    try {
      const r = await leadsApi.timeline(lead.id, { limit: 200 });
      setRows(r?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && lead?.id) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  // Reset filters when re-opened with a different lead
  useEffect(() => {
    if (open) {
      setActiveFilters([...CATEGORIES]);
      setSortOrder('newest');
      setDateFrom('');
      setDateTo('');
      setAllCollapsed(false);
    }
  }, [open, lead?.id]);

  const toggleFilter = (filter) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };
  const removeFilter = (filter) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
  };
  const addFilter = (filter) => {
    setActiveFilters((prev) => prev.includes(filter) ? prev : [...prev, filter]);
  };

  const filtered = useMemo(() => {
    let r = rows.filter((row) => activeFilters.includes(categoryOf(row)));
    if (dateFrom) {
      const t = new Date(dateFrom).getTime();
      r = r.filter((row) => new Date(row.created_at).getTime() >= t);
    }
    if (dateTo) {
      // include the entire "to" day
      const t = new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1;
      r = r.filter((row) => new Date(row.created_at).getTime() <= t);
    }
    if (sortOrder === 'oldest') return [...r].reverse();
    return r;
  }, [rows, activeFilters, sortOrder, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const row of filtered) {
      const key = fmtDayKey(row.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All time';
    if (dateFrom && dateTo) return `${fmtDate(dateFrom)} - ${fmtDate(dateTo)}`;
    if (dateFrom) return `From ${fmtDate(dateFrom)}`;
    return `Until ${fmtDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  const collapseAllToggle = () => {
    setAllCollapsed((v) => !v);
    setCollapseSeq((n) => n + 1);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent className="timeline-modal">
        {/* Header */}
        <div className="timeline-header">
          <div className="timeline-title">{lead.name || lead.phone || 'Lead'}</div>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </div>

        <div className="timeline-body">

          {/* LEFT — compact day list + date filter */}
          <div className="timeline-left">
            <div className="timeline-date-filter">
              <div
                className="date-range-picker"
                style={{ cursor: 'pointer' }}
                onClick={(e) => setDatePickerAnchor(e.currentTarget)}
              >
                <span className="date-range-text">{dateRangeLabel}</span>
                <CalendarTodayIcon className="date-range-icon" />
              </div>
              <IconButton size="small" className="reload-btn" onClick={reload} title="Reload timeline">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </div>

            <Popover
              open={Boolean(datePickerAnchor)}
              anchorEl={datePickerAnchor}
              onClose={() => setDatePickerAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <Box sx={{ p: 2, width: 280 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>Filter by date</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>FROM</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>TO</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button size="small" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
                  <Button size="small" variant="contained" onClick={() => setDatePickerAnchor(null)} sx={{ background: '#E87B2F' }}>
                    Apply
                  </Button>
                </Box>
              </Box>
            </Popover>

            {loading && <div style={{ padding: 24, textAlign: 'center' }}><CircularProgress size={20} /></div>}
            {!loading && error && <div style={{ color: '#d32f2f', padding: 12, fontSize: 13 }}>{error}</div>}
            {!loading && !error && filtered.length === 0 && (
              <div style={{ color: '#888', padding: 16, fontSize: 13 }}>No events match the selected filters.</div>
            )}

            <div className="timeline-items">
              {filtered.slice(0, 30).map((row) => (
                <div className="timeline-item" key={`${row.kind}-${row.id}`}>
                  <div className="timeline-icon-wrap">
                    {row.kind === 'activity' && row.subtype === 'stage_changed'
                      ? <SwapHorizIcon className="timeline-icon status-icon" />
                      : row.kind === 'activity'
                        ? <HistoryIcon className="timeline-icon history-icon" />
                        : <FlagIcon className="timeline-icon flag-icon" />
                    }
                    <div className="timeline-line" />
                  </div>
                  <div>
                    <div className="time">{fmtTime(row.created_at)}</div>
                    <div className="text">{titleFor(row)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — full cards grouped by day */}
          <div className="timeline-right">

            {/* Filter chips bar (top) */}
            <div className="filter-chips-bar">
              <div className="filter-chips-list">
                {activeFilters.map((filter) => (
                  <Chip
                    key={filter}
                    label={filter}
                    size="small"
                    onDelete={() => removeFilter(filter)}
                    className="filter-chip"
                  />
                ))}
                {CATEGORIES.filter((c) => !activeFilters.includes(c)).map((c) => (
                  <Chip
                    key={c}
                    label={`+ ${c}`}
                    size="small"
                    variant="outlined"
                    onClick={() => addFilter(c)}
                    className="filter-chip"
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
              <IconButton
                size="small"
                onClick={collapseAllToggle}
                title={allCollapsed ? 'Expand all days' : 'Collapse all days'}
              >
                <KeyboardArrowDownOutlinedIcon
                  fontSize="small"
                  style={{ transform: allCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms' }}
                />
              </IconButton>
            </div>

            {/* Activity Filter dropdown + sort */}
            <div className="activity-filter-bar">
              <div
                className="activity-filter-dropdown"
                style={{ cursor: 'pointer' }}
                onClick={(e) => setActivityMenuAnchor(e.currentTarget)}
              >
                <span className="activity-filter-text">
                  Activity Filter ({activeFilters.length}/{CATEGORIES.length})
                </span>
                <KeyboardArrowDownOutlinedIcon className="activity-filter-arrow" />
              </div>

              <Menu
                anchorEl={activityMenuAnchor}
                open={Boolean(activityMenuAnchor)}
                onClose={() => setActivityMenuAnchor(null)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} onClick={() => toggleFilter(c)} dense>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Checkbox
                        size="small"
                        checked={activeFilters.includes(c)}
                        sx={{ p: 0, '&.Mui-checked': { color: '#E87B2F' } }}
                      />
                    </ListItemIcon>
                    <ListItemText primary={labelWithCount(rows, c)} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
                <MenuItem
                  dense
                  onClick={() => { setActiveFilters([...CATEGORIES]); setActivityMenuAnchor(null); }}
                  sx={{ borderTop: '1px solid #eee', fontSize: 12, color: '#E87B2F' }}
                >
                  Select all
                </MenuItem>
                <MenuItem
                  dense
                  onClick={() => { setActiveFilters([]); setActivityMenuAnchor(null); }}
                  sx={{ fontSize: 12, color: '#888' }}
                >
                  Clear all
                </MenuItem>
              </Menu>

              <div
                className="sort-toggle"
                onClick={() => setSortOrder((p) => p === 'newest' ? 'oldest' : 'newest')}
                title="Toggle sort order"
              >
                <span className="sort-text">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                <div className="sort-icons">
                  <ArrowDownwardIcon className={`sort-icon ${sortOrder === 'newest' ? 'active' : ''}`} />
                  <ArrowUpwardIcon className={`sort-icon ${sortOrder === 'oldest' ? 'active' : ''}`} />
                </div>
              </div>
            </div>

            {loading && <div style={{ padding: 40, textAlign: 'center' }}><CircularProgress /></div>}

            {!loading && groups.map(([day, dayRows]) => (
              <DayGroup
                key={`${day}-${collapseSeq}`}
                day={day}
                rows={dayRows}
                initialExpanded={!allCollapsed}
                leadId={lead?.id}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DayGroup = ({ day, rows, initialExpanded = true, leadId }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  return (
    <div>
      <div className="date-group-header" onClick={() => setExpanded((v) => !v)} style={{ cursor: 'pointer' }}>
        <div className="date-group-left">
          <div className="date-group-circle" />
          <span className="date-group-text">{fmtDate(rows[0]?.created_at)} <span style={{ color: '#888', fontSize: 12 }}>· {rows.length} event{rows.length === 1 ? '' : 's'}</span></span>
        </div>
        <KeyboardArrowDownOutlinedIcon
          style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 150ms', color: '#888' }}
        />
      </div>
      {expanded && (
        <div className="date-group-content">
          {rows.map((row) => {
            // For assignment-type rows, body is "Lead reassign" / similar — the
            // subtitle conveys that already, so we don't repeat it as body text.
            const isAssignmentRow = row.kind === 'activity'
              && ['assigned', 'reassign', 'auto_assign', 'refer'].includes(row.subtype);
            return (
              <div className={`timeline-card ${accentClassFor(row)}`} key={`${row.kind}-${row.id}`}>
                <div className="timeline-card-header">
                  <div className="timeline-card-icon-title">
                    <span className="card-icon-chip">{iconFor(row)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="timeline-card-title">{titleFor(row)}</div>
                      <div className="timeline-card-subtitle">{subtitleFor(row)}</div>
                    </div>
                  </div>
                  <span className="timeline-card-time">{fmtTime(row.created_at)}</span>
                </div>
                <div className="timeline-card-body">
                  {/* Admission events — render kind-specific details so
                      "Receipt added" shows the amount, "Status changed"
                      shows the prev → next pill, etc. The generic body
                      below is suppressed for these rows so we don't print
                      the summary twice. */}
                  {row.kind === 'admission' && (() => {
                    const md = row.metadata_json || {};
                    const prev = md.prev_status;
                    const next = md.next_status;
                    if (row.subtype === 'status_changed' && (prev || next)) {
                      return (
                        <div className="timeline-card-row">
                          <Chip size="small" variant="outlined" label={prev || 'Unset'} />
                          <span className="arrow" style={{ margin: '0 8px' }}>→</span>
                          <Chip
                            size="small"
                            label={next || 'Unset'}
                            sx={{ background: '#3b82f6', color: '#fff', fontWeight: 600 }}
                          />
                        </div>
                      );
                    }
                    if (row.subtype === 'created' && next) {
                      return (
                        <div className="timeline-card-row">
                          <span style={{ color: '#9ca3af' }}>Status:&nbsp;</span>
                          <Chip
                            size="small"
                            label={next}
                            sx={{ background: '#10b981', color: '#fff', fontWeight: 600 }}
                          />
                        </div>
                      );
                    }
                    if (row.subtype === 'receipt_added' || row.subtype === 'receipt_deleted') {
                      const isAdd = row.subtype === 'receipt_added';
                      return (
                        <div className="timeline-card-row" style={{ alignItems: 'flex-start' }}>
                          <ChatBubbleOutlineIcon className="card-meta-icon" />
                          <div style={{
                            background: isAdd ? '#f0fdf4' : '#fef2f2',
                            borderLeft: `3px solid ${isAdd ? '#16a34a' : '#dc2626'}`,
                            padding: '6px 10px', borderRadius: 4, fontSize: 12,
                            color: isAdd ? '#15803d' : '#991b1b',
                            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
                          }}>
                            {md.receipt_no && <span>Receipt <strong>#{md.receipt_no}</strong> · </span>}
                            {md.receipt_kind === 'installment' && <span>Installment {md.installment_no} · </span>}
                            {md.receipt_kind === 'registration' && <span>Registration · </span>}
                            <span>Amount <strong>₹{Number(md.amount || 0).toLocaleString('en-IN')}</strong></span>
                            {md.mode_of_payment && <span> via <strong>{md.mode_of_payment}</strong></span>}
                            {isAdd && md.share_token && (
                              <a
                                href={`/r/${md.share_token}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  marginLeft: 'auto', fontWeight: 700,
                                  color: '#15803d', textDecoration: 'underline',
                                }}
                              >
                                View receipt ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }
                    if (row.subtype === 'field_edited' && md.changes) {
                      const keys = Object.keys(md.changes);
                      return (
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4, lineHeight: 1.6 }}>
                          {keys.slice(0, 4).map((k) => (
                            <div key={k}>
                              <strong>{k}</strong>: {String(md.changes[k]?.from ?? '—')} → {String(md.changes[k]?.to ?? '—')}
                            </div>
                          ))}
                          {keys.length > 4 && (
                            <div style={{ fontStyle: 'italic' }}>+{keys.length - 4} more</div>
                          )}
                        </div>
                      );
                    }
                    return row.body ? (
                      <div className="timeline-card-row">
                        <ChatBubbleOutlineIcon className="card-meta-icon" />
                        <span>{String(row.body)}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Pre-admission accounts events — the audit rows for
                      configuring the per-lead fee offer and minting the
                      public share link. Both live in lead_activities (not
                      admission_events) because they happen BEFORE an
                      admission row exists. */}
                  {row.kind === 'activity' && row.subtype === 'fee_offer_saved' && (() => {
                    const md = row.metadata_json || {};
                    return (
                      <div className="timeline-card-row" style={{ alignItems: 'flex-start' }}>
                        <ChatBubbleOutlineIcon className="card-meta-icon" />
                        <div style={{
                          background: '#fff7ed', borderLeft: '3px solid #E87B2F',
                          padding: '6px 10px', borderRadius: 4, fontSize: 12, color: '#9a3412',
                        }}>
                          Course fees <strong>₹{Number(md.course_fees || 0).toLocaleString('en-IN')}</strong>
                          {md.registration_amount != null && (
                            <> · Registration <strong>₹{Number(md.registration_amount).toLocaleString('en-IN')}</strong></>
                          )}
                          {md.payment_mode && <> · <strong>{md.payment_mode}</strong></>}
                          {Number(md.installments_count) > 0 && (
                            <> · {md.installments_count} installment{md.installments_count > 1 ? 's' : ''}</>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {row.kind === 'activity' && row.subtype === 'share_link_minted' && (() => {
                    const md = row.metadata_json || {};
                    const exp = md.expires_at ? new Date(md.expires_at) : null;
                    return (
                      <div className="timeline-card-row" style={{ alignItems: 'flex-start' }}>
                        <ChatBubbleOutlineIcon className="card-meta-icon" />
                        <div style={{
                          background: '#eef2ff', borderLeft: '3px solid #4f46e5',
                          padding: '6px 10px', borderRadius: 4, fontSize: 12, color: '#3730a3',
                        }}>
                          Public admission form link
                          {md.ttl_hours ? <> · valid {md.ttl_hours}h</> : null}
                          {exp ? <> · expires {exp.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</> : null}
                        </div>
                      </div>
                    );
                  })()}

                  {row.kind === 'activity' && row.subtype === 'stage_changed' ? (() => {
                    // The activity stores from/to for both stage and sub-stage.
                    // If the parent stage didn't move, show the sub-stage delta
                    // instead (and label the row so it's clear). If neither
                    // moved (legacy data), show a no-op badge instead of
                    // "Enrolled → Enrolled".
                    const stageMoved = (row.from_stage_name || '') !== (row.to_stage_name || '');
                    const subMoved = (row.from_sub_stage_name || '') !== (row.to_sub_stage_name || '');
                    if (stageMoved) {
                      return (
                        <div className="timeline-card-row">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={row.from_stage_name || 'Unset'}
                          />
                          <span className="arrow" style={{ margin: '0 8px' }}>→</span>
                          <Chip
                            size="small"
                            label={row.to_stage_name || 'Unset'}
                            sx={{ background: '#10b981', color: '#fff', fontWeight: 600 }}
                          />
                          {subMoved && (
                            <span style={{ marginLeft: 12, fontSize: 11, color: '#6b7280' }}>
                              Sub-stage: <strong>{row.from_sub_stage_name || '—'}</strong>
                              {' → '}<strong>{row.to_sub_stage_name || '—'}</strong>
                            </span>
                          )}
                        </div>
                      );
                    }
                    if (subMoved) {
                      return (
                        <div className="timeline-card-row">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={row.from_sub_stage_name || '—'}
                          />
                          <span className="arrow" style={{ margin: '0 8px' }}>→</span>
                          <Chip
                            size="small"
                            label={row.to_sub_stage_name || '—'}
                            sx={{ background: '#10b981', color: '#fff', fontWeight: 600 }}
                          />
                          <span style={{ marginLeft: 12, fontSize: 11, color: '#6b7280' }}>
                            within <strong>{row.to_stage_name || row.from_stage_name || 'stage'}</strong>
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="timeline-card-row" style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                        Stage re-saved (no change)
                      </div>
                    );
                  })() : (
                    row.body && !isAssignmentRow && row.kind !== 'admission' && (
                      <div className="timeline-card-row">
                        <ChatBubbleOutlineIcon className="card-meta-icon" />
                        <span>{String(row.body)}</span>
                      </div>
                    )
                  )}
                  {isAssignmentRow && row.assignee_name && (
                    <>
                      {row.subtype === 'reassign' && row.from_user_name && (
                        <div className="timeline-card-row">
                          <PersonOutlineIcon className="card-meta-icon" />
                          <span>
                            <span style={{ color: '#9ca3af', fontWeight: 500 }}>Previous owner</span>
                            {' '}<strong>{row.from_user_name}</strong>
                            {row.from_user_email && <span style={{ color: '#9ca3af' }}> · {row.from_user_email}</span>}
                          </span>
                        </div>
                      )}
                      <div className="timeline-card-row">
                        <PersonOutlineIcon className="card-meta-icon" />
                        <span>
                          <span style={{ color: '#9ca3af', fontWeight: 500 }}>Current owner</span>
                          {' '}<strong>{row.assignee_name}</strong>
                          {row.assignee_email && <span style={{ color: '#9ca3af' }}> · {row.assignee_email}</span>}
                        </span>
                      </div>
                      {row.assignee_manager_name && (
                        <div className="timeline-card-row">
                          <PersonOutlineIcon className="card-meta-icon" />
                          <span>
                            <span style={{ color: '#9ca3af', fontWeight: 500 }}>Reporting to</span>
                            {' '}<strong>{row.assignee_manager_name}</strong>
                            {row.assignee_manager_email && <span style={{ color: '#9ca3af' }}> · {row.assignee_manager_email}</span>}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {row.kind === 'activity' && row.subtype === 'call_recording_uploaded' && (
                    <RecordingPlayer leadId={leadId} row={row} />
                  )}
                  {/* Follow-up close events: surface the user's remark as a
                      distinct callout so it stands out from the generic body
                      ("Follow-up completed" / "Follow-up cancelled"). */}
                  {row.kind === 'activity'
                    && ['follow_up_completed', 'follow_up_cancelled'].includes(row.subtype)
                    && (row.metadata_json?.completion_reason || row.metadata_json?.reason) && (
                    <div className="timeline-card-row" style={{ alignItems: 'flex-start' }}>
                      <ChatBubbleOutlineIcon className="card-meta-icon" style={{ marginTop: 2 }} />
                      <div style={{
                        background: row.subtype === 'follow_up_cancelled' ? '#fef2f2' : '#f0fdf4',
                        borderLeft: `3px solid ${row.subtype === 'follow_up_cancelled' ? '#dc2626' : '#43A047'}`,
                        padding: '6px 10px',
                        borderRadius: 4,
                        flex: 1,
                        fontSize: 12,
                        color: row.subtype === 'follow_up_cancelled' ? '#991b1b' : '#1b5e20',
                      }}>
                        <strong>Reason:</strong>{' '}
                        {row.metadata_json.completion_reason || row.metadata_json.reason}
                      </div>
                    </div>
                  )}
                </div>
                {row.user_name && (
                  <div className="timeline-card-footer">
                    <span className="timeline-card-avatar">{initialsOf(row.user_name)}</span>
                    <span>
                      <span className="timeline-card-actor-label">
                        {row.subtype === 'reassign' ? 'Reassigned by'
                          : row.subtype === 'assigned' ? 'Assigned by'
                          : row.subtype === 'auto_assign' ? 'Triggered by'
                          : 'By'}
                      </span>{' '}
                      <span className="timeline-card-actor-name">{row.user_name}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Inline recording player for the timeline. The activity row carries a
// recording_id in its metadata_json — we fetch a short-lived signed URL on
// click rather than at list time so URLs only get signed for events the
// user actually plays.
function RecordingPlayer({ leadId, row }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recordingId = row?.metadata_json?.recording_id;
  const fileName = row?.metadata_json?.file_name;
  const duration = row?.metadata_json?.duration_seconds;

  const load = async () => {
    if (!recordingId || url) return;
    setLoading(true); setError('');
    try {
      const r = await leadsApi.recordings.playUrl(leadId, recordingId);
      const u = r?.data?.url;
      if (!u) throw new Error('No playback URL');
      setUrl(u);
    } catch (e) {
      setError(e?.message || 'Could not load recording');
    } finally {
      setLoading(false);
    }
  };

  if (!recordingId) {
    return (
      <div className="timeline-card-row">
        <GraphicEqIcon className="card-meta-icon" />
        <span style={{ color: '#888' }}>Recording metadata missing</span>
      </div>
    );
  }

  return (
    <div className="timeline-card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#444' }}>
        <GraphicEqIcon className="card-meta-icon" />
        <span style={{ fontWeight: 600 }}>{fileName || 'recording.mp3'}</span>
        {duration ? <span style={{ color: '#888' }}>· {duration}s</span> : null}
      </div>
      {url ? (
        <audio controls src={url} preload="none" style={{ width: '100%', height: 36 }} />
      ) : (
        <Button
          variant="text"
          size="small"
          onClick={load}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <GraphicEqIcon />}
          sx={{ fontSize: 12 }}
        >
          {loading ? 'Loading…' : 'Listen'}
        </Button>
      )}
      {error && <span style={{ fontSize: 11, color: '#d32f2f' }}>{error}</span>}
    </div>
  );
}

export default ViewTimelineModal;
