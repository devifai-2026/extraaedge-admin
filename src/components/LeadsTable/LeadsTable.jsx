// Compact table view for the Lead Manager. Same data shape as LeadCard
// (the API rows from /leads), but rendered as a row-per-lead grid.
// Selection + reassign reuse the LeadList parent props.
import React, { useState } from 'react';
import {
  Checkbox, IconButton, Tooltip, Chip, Menu, MenuItem,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ViewTimelineModal from '../ViewTimelineModal/ViewTimelineModal';
import AddNewLead from '../AddNewLead/AddNewLead';
import { flagForLead, TONE_BG, formatLeadAge, formatTimestamp } from '../../lib/leadFlags';
import { originBadge } from '../../lib/leadOrigin';
import { leadsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';
import ProtectedLeadData from '../DataProtection/ProtectedLeadData';
import MaskedPhone from '../DataProtection/MaskedPhone';

const fmt = (v) => {
  if (!v) return '-';
  try {
    const d = new Date(v);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return String(v); }
};

// Column definitions drive the header sort + per-column search controls. Both
// are SERVER-side (whole tenant DB):
//   • sortKey  — base for the server sort enum (<sortKey>_asc / _desc). Null = not sortable.
//   • searchType — 'text' (text box) | 'date' (date-only calendar picker, sends
//                  a from+to pair spanning the picked day) | null (no search).
//   • paramKey — the server query param the search box writes to. For date
//                columns this is the prefix (`created` -> created_from/created_to).
const COLUMNS = [
  { key: 'name', label: 'Name', sortKey: 'name', searchType: 'text', paramKey: 'q' },
  { key: 'phone', label: 'Phone', sortKey: 'phone', searchType: 'text', paramKey: 'phone' },
  { key: 'stage', label: 'Stage', sortKey: 'stage', searchType: 'text', paramKey: 'stage_name' },
  { key: 'sub_stage', label: 'Sub-Stage', sortKey: 'sub_stage', searchType: 'text', paramKey: 'sub_stage_name' },
  { key: 'program', label: 'Program', sortKey: 'program', searchType: 'text', paramKey: 'program_name' },
  { key: 'city', label: 'City', sortKey: 'city', searchType: 'text', paramKey: 'city' },
  { key: 'owner', label: 'Owner / Manager', sortKey: 'owner', searchType: 'text', paramKey: 'owner_name' },
  { key: 'added_by', label: 'Added By', sortKey: 'added_by', searchType: 'text', paramKey: 'added_by_name' },
  { key: 'score', label: 'Score', sortKey: 'score', searchType: null, paramKey: null },
  { key: 'created_at', label: 'Created', sortKey: 'created', searchType: 'date', paramKey: 'date' },
  { key: 'updated_at', label: 'Last Updated', sortKey: 'updated', searchType: 'date', paramKey: 'updated' },
  { key: 'age', label: 'Age', sortKey: 'age', searchType: null, paramKey: null },
  { key: 'flag', label: 'Flag', sortKey: null, searchType: null, paramKey: null },
];

// Shared styling for the per-column filter inputs.
const dateInputStyle = (width) => ({
  width,
  minWidth: 0,
  boxSizing: 'border-box',
  font: 'inherit',
  fontSize: 11,
  fontWeight: 400,
  textTransform: 'none',
  padding: '3px 6px',
  border: '1px solid #e6cdbb',
  borderRadius: 4,
  background: '#fff',
  color: '#333',
});
const dateLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  width: '100%',
  fontSize: 10,
  fontWeight: 400,
  textTransform: 'none',
  color: '#9a7a66',
};
// Fixed-width "From"/"To" tag so both date inputs line up under each other.
const dateLabelTextStyle = {
  width: 26,
  flexShrink: 0,
  textAlign: 'right',
};

const headerCellStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b4a3a',
  textTransform: 'uppercase',
  background: '#fdf3ed',
  borderBottom: '1px solid #f0d9c8',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const cellStyle = {
  padding: '10px 12px',
  fontSize: 13,
  borderBottom: '1px solid #f0f0f0',
  verticalAlign: 'middle',
};

const LeadsTable = ({
  leads, selectedIds, onToggleSelect, onToggleSelectAll, onReassign, onChanged,
  // Server-driven sort + per-column search (whole tenant DB, not just the
  // loaded page). `sort` is the server sort key string (e.g. 'name_asc').
  // `columnFilters` is keyed by SERVER param name (see PARAM_KEY below).
  sort: serverSort = 'created_desc',
  onSortChange,
  columnFilters = {},
  onColumnFilterChange,
}) => {
  const [editLead, setEditLead] = useState(null);
  const [timelineLead, setTimelineLead] = useState(null);
  const [menu, setMenu] = useState({ anchor: null, lead: null });

  // Click a header to cycle: <col>_asc → <col>_desc → default(created_desc).
  const toggleSort = (key) => {
    if (!onSortChange) return;
    const asc = `${key}_asc`;
    const desc = `${key}_desc`;
    if (serverSort === asc) onSortChange(desc);
    else if (serverSort === desc) onSortChange('created_desc');
    else onSortChange(asc);
  };
  // Rows come from the server already sorted + filtered; render as-is.
  const displayLeads = leads;
  // Lead deletion is destructive (hard-delete) and super-admin only — but we
  // surface the option for everyone and let the backend return 403 if the
  // user isn't a super-admin. That avoids silently hiding the action when
  // role detection mismatches the JWT (e.g. stale cached user object).
  const canDelete = isRole(ROLES.SUPER_ADMIN);

  const handleDelete = async (lead) => {
    if (!lead?.id) return;
    const typed = window.prompt(
      `This will PERMANENTLY delete "${lead.name || 'this lead'}" and every related row ` +
      `(activities, follow-ups, calls, messages, custom values).\n\n` +
      `This cannot be undone.\n\nType DELETE to confirm:`,
    );
    if (typed == null) return;
    if (typed.trim() !== 'DELETE') { alert('Phrase did not match — delete cancelled.'); return; }
    try {
      await leadsApi.delete(lead.id);
      onChanged?.();
    } catch (e) {
      alert(e?.message || 'Delete failed');
    }
  };

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someSelected = leads.some((l) => selectedIds.has(l.id));

  // For a date column we keep the picked day in a side key (`<paramKey>_day`)
  // so the picker stays controlled, and also push the derived from/to window
  // that the server actually filters on.
  // Date columns now take a FROM and TO day. We keep the raw 'YYYY-MM-DD' for
  // each input (so the picker shows it) and derive the server timestamps:
  //   from → start of that day, to → end of that day. Either side optional
  //   (open-ended range).
  const handleDateRangeChange = (col, side, ymd) => {
    onColumnFilterChange?.(`${col.paramKey}_${side}_day`, ymd);
    if (side === 'from') {
      onColumnFilterChange?.(`${col.paramKey}_from`, ymd ? `${ymd}T00:00:00` : '');
    } else {
      onColumnFilterChange?.(`${col.paramKey}_to`, ymd ? `${ymd}T23:59:59.999` : '');
    }
  };

  // Header cell with a click-to-sort label + a per-column search control
  // (text box, or a date-only calendar picker for date columns). Written as a
  // render function (not a child component) so the per-column <input> keeps
  // focus across re-renders instead of remounting on every keystroke.
  const sortHead = (col, align = 'left') => {
    const asc = col.sortKey && `${col.sortKey}_asc`;
    const desc = col.sortKey && `${col.sortKey}_desc`;
    const active = col.sortKey && (serverSort === asc || serverSort === desc);
    const SortIcon = !active ? UnfoldMoreIcon : (serverSort === asc ? ArrowUpwardIcon : ArrowDownwardIcon);
    const textVal = col.searchType === 'text' ? (columnFilters[col.paramKey] || '') : '';
    const dateFromVal = col.searchType === 'date' ? (columnFilters[`${col.paramKey}_from_day`] || '') : '';
    const dateToVal = col.searchType === 'date' ? (columnFilters[`${col.paramKey}_to_day`] || '') : '';
    return (
      <th
        key={col.key}
        style={{
          ...headerCellStyle,
          textAlign: align,
          // Bound the date columns so the From/To stack doesn't balloon the
          // header and shove Age/Flag/Actions off-screen.
          ...(col.searchType === 'date' ? { width: 165, minWidth: 165 } : {}),
        }}
      >
        {col.sortKey ? (
          <div
            onClick={() => toggleSort(col.sortKey)}
            title={`Sort by ${col.label}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer',
              justifyContent: align === 'right' ? 'flex-end' : 'flex-start', userSelect: 'none',
            }}
          >
            {col.label}
            <SortIcon sx={{ fontSize: 14, color: active ? '#d46b08' : '#c9a98f' }} />
          </div>
        ) : (
          <span>{col.label}</span>
        )}
        {col.searchType === 'text' && (
          <div style={{ marginTop: 4 }}>
            <input
              type="text"
              value={textVal}
              onChange={(e) => onColumnFilterChange?.(col.paramKey, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search"
              style={dateInputStyle('100%')}
            />
          </div>
        )}
        {col.searchType === 'date' && (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }} onClick={(e) => e.stopPropagation()}>
            <label style={dateLabelStyle}>
              <span style={dateLabelTextStyle}>From</span>
              <input
                type="date" value={dateFromVal}
                max={dateToVal || undefined}
                onChange={(e) => handleDateRangeChange(col, 'from', e.target.value)}
                style={dateInputStyle('100%')}
              />
            </label>
            <label style={dateLabelStyle}>
              <span style={dateLabelTextStyle}>To</span>
              <input
                type="date" value={dateToVal}
                min={dateFromVal || undefined}
                onChange={(e) => handleDateRangeChange(col, 'to', e.target.value)}
                style={dateInputStyle('100%')}
              />
            </label>
          </div>
        )}
      </th>
    );
  };

  const colByKey = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, overflow: 'auto' }}>
      <ProtectedLeadData>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400 }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: 36 }}>
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onChange={(e) => onToggleSelectAll?.(e.target.checked)}
              />
            </th>
            {sortHead(colByKey.name)}
            {sortHead(colByKey.phone)}
            {sortHead(colByKey.stage)}
            {sortHead(colByKey.sub_stage)}
            {sortHead(colByKey.program)}
            {sortHead(colByKey.city)}
            {sortHead(colByKey.owner)}
            {sortHead(colByKey.added_by)}
            {sortHead(colByKey.score)}
            {sortHead(colByKey.created_at)}
            {sortHead(colByKey.updated_at)}
            {sortHead(colByKey.age)}
            {sortHead(colByKey.flag)}
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayLeads.length === 0 && (
            <tr>
              <td colSpan={15} style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                {leads.length === 0 ? 'No leads in this view.' : 'No leads match the column filters.'}
              </td>
            </tr>
          )}
          {displayLeads.map((lead) => {
            const flag = flagForLead(lead);
            const isSelected = selectedIds.has(lead.id);
            return (
              <tr
                key={lead.id}
                style={{ background: isSelected ? '#fdf3ed' : 'transparent' }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={cellStyle}>
                  <Checkbox size="small" checked={isSelected} onChange={() => onToggleSelect?.(lead.id)} />
                </td>
                <td style={{ ...cellStyle, fontWeight: 600, cursor: 'pointer', color: '#222' }} onClick={() => setEditLead(lead)} title="Click to edit">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {lead.name || '—'}
                    {(() => {
                      const origin = originBadge(lead);
                      if (!origin) return null;
                      return (
                        <Tooltip title={`Lead came in via ${origin.label}`}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            background: origin.color, color: '#fff',
                          }}>
                            {origin.key === 'whatsapp' && <WhatsAppIcon sx={{ fontSize: 11 }} />}
                            {origin.label}
                          </span>
                        </Tooltip>
                      );
                    })()}
                  </span>
                </td>
                <td style={cellStyle}>
                  <MaskedPhone
                    value={lead.phone || lead.whatsapp_number || '-'}
                    leadId={lead.id}
                    reveal={leadsApi.revealPhone}
                    field={lead.phone ? 'phone' : 'whatsapp_number'}
                  />
                </td>
                <td style={cellStyle}>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    {lead.stage_name ? <Chip size="small" label={lead.stage_name} sx={{ height: 22, fontSize: 11 }} /> : '-'}
                    {lead.is_converted && (
                      <Tooltip title={lead.converted_at ? `Converted on ${formatTimestamp(lead.converted_at)}` : 'Converted'}>
                        <Chip
                          size="small"
                          label={lead.converted_at ? `Converted · ${formatTimestamp(lead.converted_at)}` : 'Converted'}
                          sx={{ height: 18, fontSize: 10, background: TONE_BG.converted, color: '#fff', fontWeight: 600 }}
                        />
                      </Tooltip>
                    )}
                  </span>
                </td>
                <td style={cellStyle}>{lead.sub_stage_name || '-'}</td>
                <td style={cellStyle}>{lead.program_name || '-'}</td>
                <td style={cellStyle}>{lead.city || '-'}</td>
                <td style={cellStyle}>
                  {/* Show owner + manager with their role next to the name,
                      same shape as the "Added By" column. Falls back to "Unassigned"
                      when no owner is set yet. */}
                  {lead.assigned_to_name ? (
                    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                      <span>
                        {lead.assigned_to_name}
                        {lead.assigned_to_role && (
                          <span style={{ color: '#888', fontSize: 11 }}>
                            {' · '}{String(lead.assigned_to_role).replace('_', ' ')}
                          </span>
                        )}
                      </span>
                      {lead.manager_name && (
                        <span style={{ fontSize: 11, color: '#666' }}>
                          ↳ {lead.manager_name}
                          {lead.manager_role && (
                            <span style={{ color: '#888' }}>
                              {' · '}{String(lead.manager_role).replace('_', ' ')}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: '#888' }}>Unassigned</span>
                  )}
                </td>
                <td style={cellStyle}>
                  {lead.created_by_name
                    ? <span>{lead.created_by_name} <span style={{ color: '#888', fontSize: 11 }}>· {String(lead.created_by_role || '').replace('_', ' ')}</span></span>
                    : '-'}
                </td>
                <td style={{ ...cellStyle, fontWeight: 600 }}>
                  <span style={{
                    display: 'inline-block',
                    minWidth: 28,
                    textAlign: 'center',
                    padding: '2px 6px',
                    borderRadius: 12,
                    background: '#fff7e6',
                    color: '#d46b08',
                    border: '1px solid #ffd591',
                    fontSize: 12,
                  }}>
                    ★ {lead.lead_score != null ? Number(lead.lead_score).toFixed(0) : 0}
                  </span>
                </td>
                <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: '#555' }}>
                  <Tooltip title={lead.created_at ? `Created ${formatTimestamp(lead.created_at)}` : 'Not available'}>
                    <span>{fmt(lead.created_at)}</span>
                  </Tooltip>
                </td>
                <td style={{ ...cellStyle, whiteSpace: 'nowrap', color: '#555' }}>
                  <Tooltip title={lead.updated_at ? `Last updated ${formatTimestamp(lead.updated_at)}` : 'Not available'}>
                    <span>{fmt(lead.updated_at)}</span>
                  </Tooltip>
                </td>
                <td style={cellStyle}>
                  <Tooltip title={lead.created_at ? `Created ${formatTimestamp(lead.created_at)}` : 'Lead age'}>
                    <span>{formatLeadAge(lead.created_at, lead.lead_age_days)}</span>
                  </Tooltip>
                </td>
                <td style={cellStyle}>
                  {flag
                    ? <Chip size="small" label={flag.text} sx={{ height: 20, fontSize: 10, background: TONE_BG[flag.tone] || TONE_BG.neutral, color: '#fff' }} />
                    : '-'}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Tooltip title="Call"><IconButton size="small"><CallIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="WhatsApp"><IconButton size="small"><WhatsAppIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Email"><IconButton size="small"><EmailIcon fontSize="small" /></IconButton></Tooltip>
                  {!isRole(ROLES.COUNSELLOR) && (
                    <Tooltip title="Reassign"><IconButton size="small" onClick={() => onReassign?.(lead)}><SwapHorizIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete lead (permanent)">
                      <IconButton size="small" onClick={() => handleDelete(lead)} sx={{ color: '#dc2626' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, lead })}><MoreVertIcon fontSize="small" /></IconButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </ProtectedLeadData>

      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => setMenu({ anchor: null, lead: null })}
      >
        <MenuItem onClick={() => { setEditLead(menu.lead); setMenu({ anchor: null, lead: null }); }}>Edit Lead</MenuItem>
        <MenuItem onClick={() => { setTimelineLead(menu.lead); setMenu({ anchor: null, lead: null }); }}>View Timeline</MenuItem>
        {!isRole(ROLES.COUNSELLOR) && (
          <MenuItem onClick={() => { onReassign?.(menu.lead); setMenu({ anchor: null, lead: null }); }}>Reassign</MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => { const lead = menu.lead; setMenu({ anchor: null, lead: null }); handleDelete(lead); }}
            sx={{ color: '#dc2626' }}
          >
            Delete Lead (permanent)
          </MenuItem>
        )}
      </Menu>

      <AddNewLead
        open={!!editLead}
        leadData={editLead}
        onClose={() => setEditLead(null)}
        onSaved={() => { setEditLead(null); onChanged?.(); }}
      />
      <ViewTimelineModal
        open={!!timelineLead}
        lead={timelineLead}
        onClose={() => setTimelineLead(null)}
      />
    </div>
  );
};

export default LeadsTable;
