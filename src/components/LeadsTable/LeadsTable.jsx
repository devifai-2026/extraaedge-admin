// Compact table view for the Lead Manager. Same data shape as LeadCard
// (the API rows from /leads), but rendered as a row-per-lead grid.
// Selection + reassign reuse the LeadList parent props.
import React, { useState } from 'react';
import {
  Checkbox, IconButton, Tooltip, Chip, Menu, MenuItem,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ViewTimelineModal from '../ViewTimelineModal/ViewTimelineModal';
import AddNewLead from '../AddNewLead/AddNewLead';
import { flagForLead, TONE_BG, formatLeadAge, formatTimestamp } from '../../lib/leadFlags';
import { leadsApi } from '../../lib/endpoints';
import { isRole, ROLES } from '../../lib/rbac';

const fmt = (v) => {
  if (!v) return '-';
  try {
    const d = new Date(v);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return String(v); }
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

const LeadsTable = ({ leads, selectedIds, onToggleSelect, onToggleSelectAll, onReassign, onChanged }) => {
  const [editLead, setEditLead] = useState(null);
  const [timelineLead, setTimelineLead] = useState(null);
  const [menu, setMenu] = useState({ anchor: null, lead: null });
  // Lead deletion is destructive (hard-delete) and super-admin only — but we
  // surface the option for everyone and let the backend return 403 if the
  // user isn't a super-admin. That avoids silently hiding the action when
  // role detection mismatches the JWT (e.g. stale cached user object).
  const canDelete = isRole(ROLES.SUPER_ADMIN);
  // Always render the menu item; it's role-gated visually but never silently absent.
  const showDelete = true;

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

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
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
            <th style={headerCellStyle}>Name</th>
            <th style={headerCellStyle}>Phone</th>
            <th style={headerCellStyle}>Stage</th>
            <th style={headerCellStyle}>Sub-Stage</th>
            <th style={headerCellStyle}>Program</th>
            <th style={headerCellStyle}>City</th>
            <th style={headerCellStyle}>Owner / Manager</th>
            <th style={headerCellStyle}>Added By</th>
            <th style={headerCellStyle}>Score</th>
            <th style={headerCellStyle}>Age</th>
            <th style={headerCellStyle}>Flag</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={13} style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                No leads in this view.
              </td>
            </tr>
          )}
          {leads.map((lead) => {
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
                  {lead.name || '—'}
                </td>
                <td style={cellStyle}>{lead.phone || lead.whatsapp_number || '-'}</td>
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
