import React, { useEffect, useState } from "react";
import {
    Typography,
    Tabs,
    Tab,
    Chip,
    IconButton,
    Checkbox,
    Tooltip,
} from "@mui/material";
import { Menu, MenuItem } from "@mui/material";

import CallIcon from "@mui/icons-material/Call";
import ChatIcon from "@mui/icons-material/Chat";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import VideoCallIcon from '@mui/icons-material/VideoCall';
import SmsIcon from "@mui/icons-material/Sms";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import MarkChatUnreadIcon from "@mui/icons-material/MarkChatUnread";
import EventIcon from "@mui/icons-material/Event";
import { colors } from '../../theme/colors';
import WhatsappModal from "../WhatsApp/WhatsApp";
import EmailDrawer from "../EmailDrawer/EmailDrawer";
import CallModal from "../CallModal/CallModal";
import VideoCallModal from "../VideoCall/VideoCall";
import ViewTimelineModal from "../ViewTimelineModal/ViewTimelineModal";
import AddNewLead from "../AddNewLead/AddNewLead";
import AddFollowUpDrawer from "../AddFollowUpDrawer/AddFollowUpDrawer";
import AddNoteDrawer from "../AddNoteDrawer/AddNoteDrawer";
import { followUpsApi, leadsApi } from "../../lib/endpoints";
import { useDropdown } from "../../lib/useDropdowns";
import { flagForLead, TONE_BG, formatLeadAge, formatTimestamp } from "../../lib/leadFlags";
import { originBadge } from "../../lib/leadOrigin";
import { isRole, ROLES } from "../../lib/rbac";

import "./LeadCard.css";

const fmt = (v) => {
    if (!v) return "-";
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return String(v); }
};

// Colour + label for a follow-up status, used by the "matched follow-up"
// badge that appears when the LeadList is filtered by a follow-up date
// window. Mirrors the palette in FollowUpManager so the two views read the
// same.
const FU_STATUS = {
    planned:   { color: '#FB8C00', label: 'Planned'   },
    done:      { color: '#43A047', label: 'Done'      },
    missed:    { color: '#E53935', label: 'Missed'    },
    cancelled: { color: '#9E9E9E', label: 'Cancelled' },
};
const fmtFuDate = (v) => {
    if (!v) return '';
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return ''; }
};

// Status badge resolver lives in lib/leadFlags.js — see flagForLead().

const LeadCard = ({ lead, selected, onToggleSelect, onReassign, onChanged }) => {
    const [tab, setTab] = useState(0);
    const [tabDir, setTabDir] = useState('next'); // 'next' | 'prev' — drives the slide direction
    // Tabs: 0 details, 1 source/parents, 2 followup (current + 5 past slots), 3 full follow-up history.
    const TAB_COUNT = 4;
    const goToTab = (next) => {
        setTabDir(next > tab ? 'next' : 'prev');
        setTab(((next % TAB_COUNT) + TAB_COUNT) % TAB_COUNT);
    };
    const cycleTab = (delta) => goToTab(tab + delta);
    const [openWhatsapp, setOpenWhatsapp] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [openEmail, setOpenEmail] = useState(false);
    const [openCall, setOpenCall] = useState(false);
    const [openVideo, setOpenVideo] = useState(false);
    const [openTimeline, setOpenTimeline] = useState(false);
    const [openEditLead, setOpenEditLead] = useState(false);
    const [openFollowUp, setOpenFollowUp] = useState(false);
    const [openAddNote, setOpenAddNote] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [followUp, setFollowUp] = useState(null);
    // All past (status != 'planned') follow-ups for this lead, most-recent first.
    // The slots view shows the first 5; tab 3 (full history) shows the whole list.
    const [pastFollowUps, setPastFollowUps] = useState([]);
    const [fullLead, setFullLead] = useState(null);
    // Stages list: used to label per-stage follow-up sections and to skip
    // is_success stages in the slot view.
    const stagesList = useDropdown('stages', { enabled: isExpanded });

    const openMenu = Boolean(anchorEl);

    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    // Lazy-load most recent open follow-up for the followup tab.
    useEffect(() => {
        if (!isExpanded || tab !== 2 || !lead?.id) return;
        let alive = true;
        followUpsApi.list({ lead_id: lead.id, status: 'planned', limit: 1 })
            .then((r) => { if (alive) setFollowUp(r?.data?.[0] ?? null); })
            .catch(() => { if (alive) setFollowUp(null); });
        return () => { alive = false; };
    }, [isExpanded, tab, lead?.id]);

    // Lazy-load completed/missed/cancelled follow-ups for the slots view (tab 2)
    // and the full-history tab (tab 3). We try every "non-planned" status the
    // followUpsApi exposes and merge — gives us the equivalent of the CSV's
    // 5-slot history plus anything older.
    useEffect(() => {
        if (!isExpanded || (tab !== 2 && tab !== 3) || !lead?.id) return;
        let alive = true;
        Promise.all([
            followUpsApi.list({ lead_id: lead.id, status: 'done', limit: 50 }).catch(() => ({ data: [] })),
            followUpsApi.list({ lead_id: lead.id, status: 'missed', limit: 50 }).catch(() => ({ data: [] })),
            followUpsApi.list({ lead_id: lead.id, status: 'cancelled', limit: 50 }).catch(() => ({ data: [] })),
        ])
            .then(([done, missed, cancelled]) => {
                if (!alive) return;
                // Order rule: rows that came from a CSV slot (slot_index 1..5)
                // keep slot order regardless of date. Everything else (ad-hoc
                // follow-ups, slot_index null) sorts most-recent-first AFTER
                // the slot rows. This makes the "Past Follow-up Attempts"
                // grid match the user's spreadsheet 1:1.
                const merged = [
                    ...(done?.data || []),
                    ...(missed?.data || []),
                    ...(cancelled?.data || []),
                ].sort((a, b) => {
                    const sa = Number.isInteger(a.slot_index) ? a.slot_index : Infinity;
                    const sb = Number.isInteger(b.slot_index) ? b.slot_index : Infinity;
                    if (sa !== sb) return sa - sb;
                    return new Date(b.next_action_datetime || 0) - new Date(a.next_action_datetime || 0);
                });
                setPastFollowUps(merged);
            })
            .catch(() => { if (alive) setPastFollowUps([]); });
        return () => { alive = false; };
    }, [isExpanded, tab, lead?.id]);

    // Lazy-load the full lead (sources[], family, primary_source, assignment
    // history, etc.) any time the card is expanded. Cheap because the BE
    // already does findByIdWithRelations in one round-trip and we cache by
    // lead.id, so re-expanding the same card is a no-op.
    useEffect(() => {
        if (!isExpanded || !lead?.id || fullLead?.id === lead.id) return;
        let alive = true;
        leadsApi.get(lead.id)
            .then((r) => { if (alive) setFullLead(r?.data ?? null); })
            .catch(() => { if (alive) setFullLead(null); });
        return () => { alive = false; };
    }, [isExpanded, lead?.id, fullLead?.id]);

    if (!lead) return null;

    const flag = flagForLead(lead);
    const origin = originBadge(lead);
    const stageLabel = lead.stage_name ? `${lead.stage_name}` : 'Unassigned stage';
    const subStageLabel = lead.sub_stage_name || (flag ? '' : '—');

    return (
        <div className="card">
            {/* HEADER — clean two-row layout to keep things readable:
                Row 1 (identity): checkbox · name + count chips · stage/sub-stage · flag
                Row 2 (toolbar):  comm-stats · score · age · "View all" · action icons
                Removed the absolute-positioned untouched-badge (it was overlapping
                chips on narrow widths). The flag is now inline next to the stage chip. */}
            <div className="card-header">
                <div className="card-header-row card-header-identity">
                    <Checkbox
                        size="small"
                        className="card-checkbox"
                        checked={!!selected}
                        onChange={onToggleSelect}
                    />

                    <div className="left">
                        <div className="name-row">
                            <Typography
                                className="name"
                                onClick={() => setOpenEditLead(true)}
                                style={{ cursor: 'pointer' }}
                                title={lead.name || lead.email || lead.phone || 'Unnamed'}
                            >
                                {lead.name || lead.email || lead.phone || 'Unnamed'}
                            </Typography>
                            {(lead.missed_calls_count ?? 0) > 0 && (
                                <Tooltip title={`${lead.missed_calls_count} missed call(s)`}>
                                    <span className="name-badge orange">
                                        <PhoneMissedIcon />
                                        {lead.missed_calls_count}
                                    </span>
                                </Tooltip>
                            )}
                            {(lead.unread_messages_count ?? 0) > 0 && (
                                <Tooltip title={`${lead.unread_messages_count} unread message(s)`}>
                                    <span className="name-badge green">
                                        <MarkChatUnreadIcon />
                                        {lead.unread_messages_count}
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                        <Typography className="phone" title={lead.phone || lead.whatsapp_number || lead.email || ''}>
                            {lead.phone || lead.whatsapp_number || lead.email || '-'}
                        </Typography>
                    </div>

                    <div className="status-block">
                        {origin && (
                            <Tooltip title={`Lead came in via ${origin.label}`}>
                                <Chip
                                    icon={origin.key === 'whatsapp' ? <WhatsAppIcon sx={{ fontSize: 14, color: '#fff !important' }} /> : undefined}
                                    label={origin.label}
                                    size="small"
                                    sx={{ height: 22, fontSize: 11, fontWeight: 600, background: origin.color, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
                                />
                            </Tooltip>
                        )}
                        <Chip label={stageLabel} size="small" className="status-chip" />
                        {subStageLabel && subStageLabel !== '—' && (
                            <span className="sub-status">{subStageLabel}</span>
                        )}
                        {lead.is_converted && (
                            <Tooltip title={lead.converted_at ? `Converted on ${formatTimestamp(lead.converted_at)}` : 'Converted'}>
                                <Chip
                                    label="Converted"
                                    size="small"
                                    sx={{ height: 22, fontSize: 11, background: TONE_BG.converted, color: '#fff', fontWeight: 600 }}
                                />
                            </Tooltip>
                        )}
                        {flag && (
                            <span
                                className="flag-pill"
                                style={{ background: TONE_BG[flag.tone] || TONE_BG.neutral }}
                            >
                                {flag.text}
                                <span className="untouched-dot" />
                            </span>
                        )}
                        {/* Matched follow-up(s) — only present when the LeadList
                            is filtered by a follow-up date window. Surfaces WHY
                            the lead matched (the filter now matches any status,
                            so most hits are past missed/done attempts that
                            wouldn't otherwise show on the collapsed card). */}
                        {Array.isArray(lead.matched_followups) && lead.matched_followups.length > 0 && (
                            <Tooltip
                                arrow
                                title={
                                    <div style={{ maxWidth: 280 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                            Matched follow-up{lead.matched_followups.length === 1 ? '' : 's'}
                                        </div>
                                        {lead.matched_followups.slice(0, 5).map((fu) => {
                                            const meta = FU_STATUS[fu.status] || { label: fu.status };
                                            return (
                                                <div key={fu.id} style={{ marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 600 }}>{meta.label}</span>
                                                    {' · '}{fmtFuDate(fu.next_action_datetime)}
                                                    {(fu.stage_name || fu.sub_stage_name) && (
                                                        <div style={{ opacity: 0.9 }}>
                                                            <span style={{ fontWeight: 600 }}>Stage:</span> {fu.stage_name || '—'}
                                                            {' · '}
                                                            <span style={{ fontWeight: 600 }}>Sub-stage:</span> {fu.sub_stage_name || '—'}
                                                        </div>
                                                    )}
                                                    {fu.comment ? <div style={{ fontStyle: 'italic', opacity: 0.85 }}>&quot;{fu.comment}&quot;</div> : null}
                                                </div>
                                            );
                                        })}
                                        {lead.matched_followups.length > 5 && (
                                            <div style={{ opacity: 0.75 }}>+{lead.matched_followups.length - 5} more</div>
                                        )}
                                    </div>
                                }
                            >
                                {(() => {
                                    const fu = lead.matched_followups[0];
                                    const meta = FU_STATUS[fu.status] || { color: '#9E9E9E', label: fu.status };
                                    const extra = lead.matched_followups.length - 1;
                                    return (
                                        <span
                                            className="flag-pill"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                background: `${meta.color}1A`, color: meta.color, fontWeight: 700,
                                            }}
                                        >
                                            <EventIcon style={{ fontSize: 13 }} />
                                            {meta.label} · {fmtFuDate(fu.next_action_datetime)}
                                            {extra > 0 ? ` +${extra}` : ''}
                                        </span>
                                    );
                                })()}
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className="card-header-row card-header-toolbar">
                    <div className="comm-stats">
                        <Tooltip title="Total calls">
                            <span className="stat-item"><CallIcon className="stat-icon" /> 0</span>
                        </Tooltip>
                        <Tooltip title="WhatsApp messages">
                            <span className="stat-item"><ChatIcon className="stat-icon" /> 0</span>
                        </Tooltip>
                        <Tooltip title="Emails (open timeline)">
                            <span className="stat-item" onClick={() => setOpenTimeline(true)} style={{ cursor: "pointer" }}>
                                <EmailIcon className="stat-icon" /> 0
                            </span>
                        </Tooltip>
                        <Tooltip title="SMS (open timeline)">
                            <span className="stat-item" onClick={() => setOpenTimeline(true)} style={{ cursor: "pointer" }}>
                                <SmsIcon className="stat-icon" /> 0
                            </span>
                        </Tooltip>
                        <span className="header-divider" />
                        <Tooltip title={`Lead score${lead.lead_score != null ? ` (${Number(lead.lead_score).toFixed(0)})` : ''}`}>
                            <span className="stat-item" style={{ cursor: 'default', fontWeight: 600 }}>
                                ★ {lead.lead_score != null ? Number(lead.lead_score).toFixed(0) : 0}
                            </span>
                        </Tooltip>
                        <Tooltip title={lead.created_at ? `Created ${formatTimestamp(lead.created_at)}` : 'Lead age'}>
                            <span className="stat-item" style={{ cursor: 'default' }}>
                                {formatLeadAge(lead.created_at, lead.lead_age_days)}
                            </span>
                        </Tooltip>
                        <span className="view-all" onClick={() => setOpenTimeline(true)} style={{ cursor: "pointer" }}>View all</span>
                    </div>

                    <div className="actions">
                        <Tooltip title="Video call">
                            <IconButton size="small" className="action-btn" onClick={() => setOpenVideo(true)}><VideoCallIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Call">
                            <IconButton size="small" className="action-btn" onClick={() => setOpenCall(true)}><CallIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="SMS">
                            <IconButton size="small" className="action-btn"><SmsIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="Email">
                            <IconButton size="small" className="action-btn" onClick={() => setOpenEmail(true)}><EmailIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="WhatsApp">
                            <IconButton size="small" className="action-btn whatsapp" onClick={() => setOpenWhatsapp(true)}>
                                <WhatsAppIcon sx={{ color: colors.primary }} />
                            </IconButton>
                        </Tooltip>
                        {/* Refer / reassign action — hidden for counsellors who
                            cannot reassign leads they own. Server enforces the
                            same restriction on POST /lead-assignments. */}
                        {!isRole(ROLES.COUNSELLOR) && (
                            <Tooltip title="Reassign">
                                <IconButton size="small" className="action-btn" onClick={onReassign}><SwapHorizIcon /></IconButton>
                            </Tooltip>
                        )}
                        <IconButton size="small" className="action-btn" onClick={handleMenuClick}><MoreVertIcon /></IconButton>
                        <IconButton size="small" className="action-btn" onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? <ExpandLessIcon /> : <ChevronRightIcon />}
                        </IconButton>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <>
                    <div className="tabs">
                        <Tabs value={tab} onChange={(e, v) => goToTab(v)}>
                            <Tab label="Personal Details" />
                            <Tab label="Source Details" />
                            <Tab label="Followup Details" />
                        </Tabs>
                    </div>

                    {tab === 0 && (
                        <div className="content-wrapper">
                            <div className={`content content-anim ${tabDir === 'prev' ? 'dir-prev' : ''}`} key={`tab-0-${tab}`}>
                                <div className="grid">
                                    <Field label="PROGRAM" value={lead.program_name} />
                                    <Field label="COUNTRY" value={lead.country_name} />
                                    <Field label="STATE" value={lead.state_name} />
                                    <Field label="DISTRICT" value={lead.district} />
                                    <Field label="CITY" value={lead.city} />
                                    <Field label="LEAD ADDED ON" value={fmt(lead.created_at)} />
                                    <Field label="LAST UPDATED ON" value={fmt(lead.updated_at)} />
                                    <Field
                                        label="PREVIOUS LEAD OWNER"
                                        value={(() => {
                                            // Prefer the BE-resolved previous_owner from findByIdWithRelations
                                            // (includes email); fall back to the list-row lateral subquery name.
                                            const po = fullLead?.previous_owner;
                                            if (po?.assigned_to_name) {
                                                return po.assigned_to_email
                                                    ? `${po.assigned_to_name} (${po.assigned_to_email})`
                                                    : po.assigned_to_name;
                                            }
                                            return lead.previous_owner_name || '-';
                                        })()}
                                    />
                                    <Field
                                        label="CURRENT LEAD OWNER"
                                        value={(() => {
                                            if (!lead.assigned_to_name) return 'Not assigned to anyone';
                                            // Build the assignment hierarchy chain:
                                            //   counsellor → manager → super admin
                                            // (or whatever subset is non-null).
                                            const chain = [
                                                { name: lead.assigned_to_name, role: lead.assigned_to_role },
                                                { name: lead.manager_name, role: lead.manager_role },
                                                { name: lead.grand_manager_name, role: lead.grand_manager_role },
                                            ].filter((x) => x.name);
                                            return chain
                                                .map((x) => x.role
                                                    ? `${x.name} (${String(x.role).replace(/_/g, ' ')})`
                                                    : x.name)
                                                .join(' → ');
                                        })()}
                                    />
                                    <Field
                                        label="ADDED BY"
                                        value={lead.created_by_name
                                            ? `${lead.created_by_name}${lead.created_by_role ? ` · ${lead.created_by_role.replace(/_/g, ' ')}` : ''}`
                                            : '—'}
                                    />
                                    <Field label="LEAD SCORE" value={lead.lead_score != null ? Number(lead.lead_score).toFixed(0) : '0'} />
                                    <Field label="LEAD AGE" value={formatLeadAge(lead.created_at, lead.lead_age_days)} />
                                    {lead.is_converted && (
                                        <Field label="CONVERTED ON" value={fmt(lead.converted_at)} />
                                    )}
                                </div>

                                {/* Extended fields — only render once findByIdWithRelations has
                                    returned. Hides UUIDs; resolves FK names where the BE join
                                    surfaces them, falls back to raw text otherwise. */}
                                {fullLead && (
                                    <>
                                        <div className="field-section-label">Contact</div>
                                        <div className="grid">
                                            <Field label="EMAIL" value={fullLead.email} />
                                            <Field label="ALTERNATE EMAIL" value={fullLead.alternate_email} />
                                            <Field label="PHONE" value={fullLead.phone} />
                                            <Field label="WHATSAPP" value={fullLead.whatsapp_number} />
                                            <Field label="ALTERNATE CONTACT" value={fullLead.alternate_contact} />
                                            <Field label="GENDER" value={fullLead.gender} />
                                            <Field label="LANGUAGE" value={fullLead.language} />
                                            <Field label="ADDRESS" value={fullLead.address} />
                                            <Field label="PINCODE" value={fullLead.pincode} />
                                        </div>

                                        {(fullLead.ug_graduation_year || fullLead.pg_graduation_year) && (
                                            <>
                                                <div className="field-section-label">Education</div>
                                                <div className="grid">
                                                    <Field label="UG GRADUATION YEAR" value={fullLead.ug_graduation_year} />
                                                    <Field label="PG GRADUATION YEAR" value={fullLead.pg_graduation_year} />
                                                </div>
                                            </>
                                        )}

                                        {fullLead.family && Object.values(fullLead.family).some(
                                            (v) => v && typeof v === 'string',
                                        ) && (
                                            <>
                                                <div className="field-section-label">Family</div>
                                                <div className="grid">
                                                    <Field label="FATHER" value={fullLead.family.father_name} />
                                                    <Field label="FATHER MOBILE" value={fullLead.family.father_mobile} />
                                                    <Field label="FATHER EMAIL" value={fullLead.family.father_email} />
                                                    <Field label="MOTHER" value={fullLead.family.mother_name} />
                                                    <Field label="MOTHER MOBILE" value={fullLead.family.mother_mobile} />
                                                    <Field label="MOTHER EMAIL" value={fullLead.family.mother_email} />
                                                    <Field label="GUARDIAN" value={fullLead.family.guardian_name} />
                                                    <Field label="GUARDIAN MOBILE" value={fullLead.family.guardian_mobile} />
                                                    <Field label="GUARDIAN EMAIL" value={fullLead.family.guardian_email} />
                                                </div>
                                            </>
                                        )}

                                        {/* Ownership history — surfaces every reassignment, including
                                            the previous_lead_owner_email row written by the bulk worker. */}
                                        {fullLead.assignments && fullLead.assignments.length > 1 && (
                                            <>
                                                <div className="field-section-label">Ownership history</div>
                                                <div className="ownership-history">
                                                    {fullLead.assignments.map((a) => (
                                                        <div key={a.id} className="ownership-row">
                                                            <span className={`ownership-badge ${a.is_active ? 'active' : ''}`}>
                                                                {a.is_active ? 'CURRENT' : 'PAST'}
                                                            </span>
                                                            <span className="ownership-name">
                                                                {a.assigned_to_name || '—'}
                                                                {a.assigned_to_email && (
                                                                    <span className="ownership-email"> ({a.assigned_to_email})</span>
                                                                )}
                                                            </span>
                                                            <span className="ownership-date">{fmt(a.created_at)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="content-chevron">
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Previous section"
                                    onClick={() => cycleTab(-1)}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Next section"
                                    onClick={() => cycleTab(1)}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 1 && (
                        <div className="content-wrapper">
                            <div className={`content content-anim ${tabDir === 'prev' ? 'dir-prev' : ''}`} key={`tab-1-${tab}`}>
                                <div className="grid" style={{ marginBottom: 12 }}>
                                    <Field
                                        label="PRIMARY SOURCE"
                                        value={fullLead?.primary_source?.name || (lead.primary_source_name || '—')}
                                    />
                                    <Field label="REFERRAL CODE USED" value={lead.referral_code_used} />
                                    <Field label="REFERRAL SOURCE" value={fullLead?.referral_source} />
                                </div>
                                <div className="source-table">
                                    <div className="table-header">
                                        <div className="table-cell">CHANNEL</div>
                                        <div className="table-cell">SOURCE</div>
                                        <div className="table-cell">CAMPAIGN</div>
                                        <div className="table-cell">MEDIUM</div>
                                    </div>
                                    {(fullLead?.sources && fullLead.sources.length > 0) ? (
                                        fullLead.sources.map((item, index) => (
                                            <div key={index} className="table-row">
                                                <div className="table-cell">{item.channel_name || '-'}</div>
                                                <div className="table-cell">{item.source_name || '-'}</div>
                                                <div className="table-cell">{item.campaign_name || '-'}</div>
                                                <div className="table-cell">{item.medium_name || '-'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="table-row">
                                            <div className="table-cell">{lead.first_touch_channel || '-'}</div>
                                            <div className="table-cell">{lead.first_touch_source || '-'}</div>
                                            <div className="table-cell">-</div>
                                            <div className="table-cell">{lead.first_touch_medium || '-'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="content-chevron">
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Previous section"
                                    onClick={() => cycleTab(-1)}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Next section"
                                    onClick={() => cycleTab(1)}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 2 && (
                        <div className="content-wrapper">
                            <div className={`content content-anim ${tabDir === 'prev' ? 'dir-prev' : ''}`} key={`tab-2-${tab}`}>
                                <div className="followup-container">
                                    <div className="followup-section">
                                        <div className="followup-label">FOLLOWUP SCHEDULED ON</div>
                                        <div className="followup-value">{followUp?.next_action_datetime ? fmt(followUp.next_action_datetime) : '— No upcoming follow-up'}</div>
                                    </div>
                                    <div className="followup-section">
                                        <div className="followup-label">FOLLOWUP REMARKS</div>
                                        <div className="followup-value followup-remarks">{followUp?.notes || followUp?.remarks || followUp?.comment || '-'}</div>
                                    </div>
                                </div>

                                {/* Per-stage 5-slot view. Each stage the lead has rows for
                                    gets its own labeled block of 5 fixed rows. Rows scoped to
                                    is_success ("Converted") stages are hidden. Ad-hoc rows
                                    (no slot_index / stage_id) fall under an "Other" section. */}
                                {(() => {
                                    const stagesById = new Map((stagesList.data || []).map((s) => [s.id, s]));
                                    const byStage = new Map();
                                    const adhoc = [];
                                    for (const f of pastFollowUps) {
                                        if (f.stage_id && Number.isInteger(f.slot_index)
                                            && f.slot_index >= 1 && f.slot_index <= 5) {
                                            const stage = stagesById.get(f.stage_id);
                                            if (stage?.is_success) continue;
                                            if (!byStage.has(f.stage_id)) byStage.set(f.stage_id, new Map());
                                            const slots = byStage.get(f.stage_id);
                                            if (!slots.has(f.slot_index)) slots.set(f.slot_index, f);
                                        } else {
                                            adhoc.push(f);
                                        }
                                    }
                                    const sections = [...byStage.entries()].map(([stageId, slots]) => ({
                                        stage_id: stageId,
                                        stage_name: stagesById.get(stageId)?.name || 'Unknown stage',
                                        slots,
                                    }));
                                    if (adhoc.length) sections.push({ stage_id: null, stage_name: 'Other', slots: null, adhoc });
                                    if (sections.length === 0) {
                                        return (
                                            <div className="followup-container" style={{ marginTop: 12, gridTemplateColumns: '1fr' }}>
                                                <div className="followup-value" style={{ color: '#999' }}>— No past attempts yet</div>
                                            </div>
                                        );
                                    }
                                    return sections.map((section) => (
                                        <div key={section.stage_id || 'adhoc'} className="followup-container"
                                             style={{ marginTop: 12, gridTemplateColumns: '1fr' }}>
                                            <div className="followup-section" style={{ paddingBottom: 4 }}>
                                                <div className="followup-label" style={{ fontWeight: 600 }}>
                                                    {section.stage_name}
                                                </div>
                                            </div>
                                            {section.adhoc
                                                ? section.adhoc.map((f) => (
                                                    <div className="followup-section" key={f.id}
                                                         style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, paddingBottom: 6, borderBottom: '1px dashed #eee' }}>
                                                        <div>
                                                            <div className="followup-label">DATE</div>
                                                            <div className="followup-value">{f.next_action_datetime ? fmt(f.next_action_datetime) : '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="followup-label">COMMENT</div>
                                                            <div className="followup-value followup-remarks">{f.comment || f.notes || '-'}</div>
                                                        </div>
                                                    </div>
                                                ))
                                                : [0, 1, 2, 3, 4].map((idx) => {
                                                    const f = section.slots.get(idx + 1);
                                                    const isDone = f?.status === 'done';
                                                    return (
                                                        <div className="followup-section" key={idx}
                                                             style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, paddingBottom: 6, borderBottom: '1px dashed #eee' }}>
                                                            <div>
                                                                <div className="followup-label">
                                                                    NEXT ACTION DATE {idx + 1}
                                                                    {isDone && (
                                                                        <span style={{
                                                                            marginLeft: 6, fontSize: 9, fontWeight: 700,
                                                                            background: '#e8f5e9', color: '#1b5e20',
                                                                            padding: '1px 5px', borderRadius: 3,
                                                                        }}>DONE</span>
                                                                    )}
                                                                </div>
                                                                <div className="followup-value">{f?.next_action_datetime ? fmt(f.next_action_datetime) : '-'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="followup-label">COMMENT {idx + 1}</div>
                                                                <div className="followup-value followup-remarks">{f?.comment || f?.notes || '-'}</div>
                                                                {isDone && f?.completion_reason && (
                                                                    <div style={{
                                                                        marginTop: 4, fontSize: 11, color: '#1b5e20',
                                                                        background: '#f0fdf4', borderLeft: '3px solid #43A047',
                                                                        padding: '4px 8px', borderRadius: 3,
                                                                    }}>
                                                                        <strong>Closure:</strong> {f.completion_reason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ));
                                })()}
                            </div>
                            <div className="content-chevron">
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Previous section"
                                    onClick={() => cycleTab(-1)}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Next section"
                                    onClick={() => cycleTab(1)}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    )}

                    {tab === 3 && (
                        <div className="content-wrapper">
                            <div className={`content content-anim ${tabDir === 'prev' ? 'dir-prev' : ''}`} key={`tab-3-${tab}`}>
                                <div className="followup-section" style={{ paddingBottom: 6 }}>
                                    <div className="followup-label">FULL FOLLOW-UP HISTORY</div>
                                    <div className="followup-value" style={{ fontSize: 12, color: '#777' }}>
                                        {pastFollowUps.length === 0
                                            ? '— No past follow-ups yet'
                                            : `${pastFollowUps.length} past attempt${pastFollowUps.length === 1 ? '' : 's'}`}
                                    </div>
                                </div>
                                <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
                                    {pastFollowUps.map((f) => (
                                        <div
                                            key={f.id}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '180px 80px 1fr',
                                                gap: 12,
                                                padding: '8px 0',
                                                borderBottom: '1px solid #eee',
                                            }}
                                        >
                                            <div style={{ fontSize: 13 }}>{fmt(f.next_action_datetime)}</div>
                                            <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>{f.status || ''}</div>
                                            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{f.comment || f.notes || '-'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="content-chevron">
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Previous section"
                                    onClick={() => cycleTab(-1)}
                                >
                                    <ChevronLeftIcon />
                                </button>
                                <button
                                    type="button"
                                    className="content-chevron-btn"
                                    aria-label="Next section"
                                    onClick={() => cycleTab(1)}
                                >
                                    <ChevronRightIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <WhatsappModal open={openWhatsapp} onClose={() => setOpenWhatsapp(false)} lead={lead} />
            <EmailDrawer open={openEmail} onClose={() => setOpenEmail(false)} lead={lead} />
            <CallModal open={openCall} onClose={() => setOpenCall(false)} lead={lead} />
            <VideoCallModal open={openVideo} onClose={() => setOpenVideo(false)} lead={lead} />
            <ViewTimelineModal open={openTimeline} onClose={() => setOpenTimeline(false)} lead={lead} />
            <AddNewLead
                open={openEditLead}
                onClose={() => setOpenEditLead(false)}
                leadData={lead}
                onSaved={() => { setOpenEditLead(false); onChanged?.(); }}
            />
            <AddFollowUpDrawer open={openFollowUp} onClose={() => setOpenFollowUp(false)} lead={lead} onSaved={() => { setOpenFollowUp(false); onChanged?.(); }} />
            <AddNoteDrawer open={openAddNote} onClose={() => setOpenAddNote(false)} lead={lead} onSaved={() => setOpenAddNote(false)} />

            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem onClick={() => { handleMenuClose(); setOpenEditLead(true); }}>Edit Lead</MenuItem>
                {/* View Timeline — first-class menu entry so users find
                    it from the More menu, not just from the "View all"
                    link buried under the comm-stats. */}
                <MenuItem onClick={() => { handleMenuClose(); setOpenTimeline(true); }}>View Timeline</MenuItem>
                {!isRole(ROLES.COUNSELLOR) && (
                    <MenuItem onClick={() => { handleMenuClose(); onReassign?.(); }}>Reassign</MenuItem>
                )}
                <MenuItem onClick={() => { handleMenuClose(); setOpenFollowUp(true); }}>Add Follow Up</MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); setOpenAddNote(true); }}>Add Note</MenuItem>
            </Menu>
        </div>
    );
};

const Field = ({ label, value }) => (
    <div className="field">
        <span className="field-label">{label}</span>
        <span className="field-value">{value || "-"}</span>
    </div>
);

export { LeadCard };
export default LeadCard;
