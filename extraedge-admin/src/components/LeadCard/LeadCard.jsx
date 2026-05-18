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
import { flagForLead, TONE_BG, formatLeadAge, formatTimestamp } from "../../lib/leadFlags";

import "./LeadCard.css";

const fmt = (v) => {
    if (!v) return "-";
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return String(v); }
};

// Status badge resolver lives in lib/leadFlags.js — see flagForLead().

const LeadCard = ({ lead, selected, onToggleSelect, onReassign, onChanged }) => {
    const [tab, setTab] = useState(0);
    const [tabDir, setTabDir] = useState('next'); // 'next' | 'prev' — drives the slide direction
    const TAB_COUNT = 3;
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
    const [fullLead, setFullLead] = useState(null);

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
    const stageLabel = lead.stage_name ? `${lead.stage_name}` : 'Unassigned stage';
    const subStageLabel = lead.sub_stage_name || (flag ? '' : '—');

    return (
        <div className="card">
            {/* HEADER */}
            <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
                                title="Click to edit"
                            >
                                {lead.name || lead.email || lead.phone || 'Unnamed'}
                            </Typography>
                            <Tooltip title={`${lead.missed_calls_count ?? 0} missed call(s)`}>
                                <span className="name-badge orange">
                                    <PhoneMissedIcon />
                                    {lead.missed_calls_count ?? 0}
                                </span>
                            </Tooltip>
                            <Tooltip title={`${lead.unread_messages_count ?? 0} unread message(s)`}>
                                <span className="name-badge green">
                                    <MarkChatUnreadIcon />
                                    {lead.unread_messages_count ?? 0}
                                </span>
                            </Tooltip>
                        </div>
                        <Typography className="phone">{lead.phone || lead.whatsapp_number || lead.email || '-'}</Typography>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div className="status">
                        <Chip label={stageLabel} size="small" className="status-chip" />
                        {subStageLabel && <span className="sub-status">{subStageLabel}</span>}
                        {lead.is_converted && (
                            <Tooltip title={lead.converted_at ? `Converted on ${formatTimestamp(lead.converted_at)}` : 'Converted'}>
                                <Chip
                                    label="Converted"
                                    size="small"
                                    sx={{ height: 22, fontSize: 11, background: TONE_BG.converted, color: '#fff', fontWeight: 600 }}
                                />
                            </Tooltip>
                        )}
                    </div>

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
                    </div>

                    <div className="header-divider" />

                    <div className="activity-icons">
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
                    <Tooltip title="Reassign">
                        <IconButton size="small" className="action-btn" onClick={onReassign}><SwapHorizIcon /></IconButton>
                    </Tooltip>
                    <IconButton size="small" className="action-btn" onClick={handleMenuClick}><MoreVertIcon /></IconButton>
                    <IconButton size="small" className="action-btn" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <ExpandLessIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </div>

                {flag && (
                    <div className="untouched-badge" style={{ background: TONE_BG[flag.tone] || TONE_BG.neutral }}>
                        {flag.text} <span className="untouched-dot" />
                    </div>
                )}
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
                                        <div className="followup-value followup-remarks">{followUp?.notes || followUp?.remarks || '-'}</div>
                                    </div>
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
                <MenuItem onClick={() => { handleMenuClose(); onReassign?.(); }}>Reassign</MenuItem>
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
