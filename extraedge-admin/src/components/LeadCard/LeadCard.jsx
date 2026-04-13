import React, { useState } from "react";
import {
    Typography,
    Tabs,
    Tab,
    Chip,
    IconButton,
    Checkbox,
    Badge,
} from "@mui/material";

import CallIcon from "@mui/icons-material/Call";
import ChatIcon from "@mui/icons-material/Chat";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import SmsIcon from "@mui/icons-material/Sms";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import "./LeadCard.css";

const LEadCardDataArray = [
    {
        id: 1,
        name: "Pradip Pawar",
        phone: "9665948342",
        status: "09-Visited",
        subStatus: "Will join soon",
        value: "Untouched",
        personal: {
            program: "Data Analyst Training and Certification",
            country: "India",
            state: "",
            district: "",
            city: "",
            leadAddedOn: "Jan 20, 2026 10:47 AM",
            lastUpdatedOn: "Apr 7, 2026 3:58 PM",
            previousLeadOwner: "Nikita Nagle",
            currentLeadOwner: "Divya Nair",
            leadAge: "80 Days"
        },
        source: [
            {
                channel: "Direct",
                source: "Website",
                campaign: "ORGANIC",
                medium: "Free"
            }
        ],
        followup: {
            scheduledOn: "Apr 9, 2026 10:58 AM",
            remarks: "suggested him to think well and confirm the enrollment by 11pm..."
        }
    },
    {
        id: 2,
        name: "Aarav Singh",
        phone: "9876543210",
        status: "08-Interested",
         value: "Untouchedss",
        subStatus: "Awaiting confirmation",
        personal: {
            program: "Advanced Python Development",
            country: "India",
            state: "Maharashtra",
            district: "Pune",
            city: "Pune",
            leadAddedOn: "Feb 15, 2026 2:30 PM",
            lastUpdatedOn: "Apr 5, 2026 5:15 PM",
            previousLeadOwner: "Rajesh Kumar",
            currentLeadOwner: "Priya Sharma",
            leadAge: "55 Days"
        },
        source: [
            {
                channel: "Facebook",
                source: "Social Media",
                campaign: "PAID",
                medium: "CPC"
            }
        ],
        followup: {
            scheduledOn: "Apr 11, 2026 3:00 PM",
            remarks: "Contact regarding course fees and batch timings"
        }
    },
    {
        id: 3,
        name: "Sneha Desai",
        phone: "9123456789",
        status: "10-Enrolled",
         value: "",
        subStatus: "Active student",
        personal: {
            program: "Full Stack Web Development",
            country: "India",
            state: "Karnataka",
            district: "Bangalore",
            city: "Bangalore",
            leadAddedOn: "Dec 10, 2025 11:20 AM",
            lastUpdatedOn: "Apr 8, 2026 9:45 AM",
            previousLeadOwner: "Amit Patel",
            currentLeadOwner: "Neha Gupta",
            leadAge: "122 Days"
        },
        source: [
            {
                channel: "LinkedIn",
                source: "Professional Network",
                campaign: "ORGANIC",
                medium: "Referral"
            }
        ],
        followup: {
            scheduledOn: "Apr 15, 2026 10:00 AM",
            remarks: "Course progress review and assignment submission"
        }
    },
    {
        id: 4,
        name: "Rohit Verma",
        phone: "9555666777",
        status: "05-Qualified",
         value: "Untouched",
        subStatus: "Negotiation phase",
        personal: {
            program: "Data Science with ML",
            country: "India",
            state: "Delhi",
            district: "Central Delhi",
            city: "New Delhi",
            leadAddedOn: "Mar 1, 2026 8:15 AM",
            lastUpdatedOn: "Apr 6, 2026 4:20 PM",
            previousLeadOwner: "Vikram Singh",
            currentLeadOwner: "Anjali Verma",
            leadAge: "41 Days"
        },
        source: [
            {
                channel: "Google Ads",
                source: "Search Engine",
                campaign: "PAID",
                medium: "CPC"
            }
        ],
        followup: {
            scheduledOn: "Apr 12, 2026 2:30 PM",
            remarks: "Follow up on EMI options and scholarship eligibility"
        }
    },
    {
        id: 5,
        name: "Priya Nair",
        phone: "9888999000",
        status: "07-Requirement Match",
         value: "",
        subStatus: "Needs demo",
        personal: {
            program: "UI/UX Design Bootcamp",
            country: "India",
            state: "Tamil Nadu",
            district: "Chennai",
            city: "Chennai",
            leadAddedOn: "Mar 20, 2026 3:45 PM",
            lastUpdatedOn: "Apr 4, 2026 11:30 AM",
            previousLeadOwner: "Sanjana Iyer",
            currentLeadOwner: "Karthik Mehta",
            leadAge: "22 Days"
        },
        source: [
            {
                channel: "Email Campaign",
                source: "Newsletter",
                campaign: "ORGANIC",
                medium: "Email"
            }
        ],
        followup: {
            scheduledOn: "Apr 10, 2026 5:00 PM",
            remarks: "Schedule live demo session and discuss portfolio projects"
        }
    }
];

const LeadCard = ({ lead }) => {
    const [tab, setTab] = useState(0);

    // if (!lead) return null;

    return (
        <div className="card">

            {/* HEADER */}
            <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {/* CHECKBOX */}
                    <Checkbox size="small" className="card-checkbox" />

                    {/* LEFT: NAME + PHONE */}
                    <div className="left">
                        <div className="name-row">
                            <Typography className="name">{lead.name}</Typography>
                            <span className="name-badge orange">0</span>
                            <span className="name-badge green">0</span>
                        </div>
                        <Typography className="phone">{lead.phone}</Typography>
                    </div>

                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    {/* STATUS */}
                    <div className="status">
                        <Chip label={lead.status} size="small" className="status-chip" />
                        <span className="sub-status">{lead.subStatus}</span>
                    </div>

                    {/* COMMUNICATION STATS */}
                    <div className="comm-stats">
                        <span className="stat-item"><CallIcon className="stat-icon" /> 0</span>
                        <span className="stat-item"><ChatIcon className="stat-icon" /> 0</span>
                        <span className="stat-item"><EmailIcon className="stat-icon" /> 0</span>
                        <span className="stat-item"><SmsIcon className="stat-icon" /> 27</span>
                    </div>

                    {/* DIVIDER */}
                    <div className="header-divider" />

                    {/* ACTIVITY ICONS */}
                    <div className="activity-icons">
                        <Badge badgeContent={36} color="default" className="activity-badge">
                            <GroupIcon className="activity-icon" />
                        </Badge>
                        <Badge badgeContent={0} color="error" overlap="circular" className="activity-badge">
                            <PersonIcon className="activity-icon" />
                        </Badge>
                        <Badge badgeContent={0} color="success" overlap="circular" className="activity-badge">
                            <SwapHorizIcon className="activity-icon" />
                        </Badge>
                        <span className="view-all">View all</span>
                    </div>
                </div>



                {/* ACTION ICONS */}
                <div className="actions">
                    <IconButton size="small" className="action-btn"><MailOutlineIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><CallIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><ChatIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><SmsIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><EmailIcon /></IconButton>
                    <IconButton size="small" className="action-btn whatsapp"><WhatsAppIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><MoreVertIcon /></IconButton>
                    <IconButton size="small" className="action-btn"><ExpandLessIcon /></IconButton>
                </div>

                {/* UNTOUCHED BADGE */}
                {lead.value && (
                    <div className="untouched-badge">
                        {lead.value} <span className="untouched-dot" />
                    </div>
                )}

            </div>

            {/* TABS */}
            <div className="tabs">
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Personal Details" />
                    <Tab label="Source Details" />
                    <Tab label="Followup Details" />
                </Tabs>
            </div>

            {/* CONTENT */}
            {tab === 0 && (
                <div className="content-wrapper">
                    <div className="content">

                        <div className="grid">
                            <Field label="PROGRAM" value={lead.personal.program} />
                            <Field label="COUNTRY" value={lead.personal.country} />
                            <Field label="STATE" value={lead.personal.state} />
                            <Field label="DISTRICT" value={lead.personal.district} />

                            <Field label="CITY" value={lead.personal.city} />
                            <Field label="LEAD ADDED ON" value={lead.personal.leadAddedOn} />
                            <Field label="LAST UPDATED ON" value={lead.personal.lastUpdatedOn} />
                            <Field label="PREVIOUS LEAD OWNER" value={lead.personal.previousLeadOwner} />

                            <Field label="CURRENT LEAD OWNER" value={lead.personal.currentLeadOwner} />
                            <Field label="LEAD AGE" value={lead.personal.leadAge} />
                        </div>

                    </div>

                    <div className="content-chevron">
                        <ChevronRightIcon />
                    </div>
                </div>
            )}

            {tab === 1 && (
                <div className="content-wrapper">
                    <div className="content">
                        <div className="source-table">
                            <div className="table-header">
                                <div className="table-cell">CHANNEL</div>
                                <div className="table-cell">SOURCE</div>
                                <div className="table-cell">CAMPAIGN</div>
                                <div className="table-cell">MEDIUM</div>
                            </div>
                            {lead.source.map((item, index) => (
                                <div key={index} className="table-row">
                                    <div className="table-cell">{item.channel}</div>
                                    <div className="table-cell">{item.source}</div>
                                    <div className="table-cell">{item.campaign}</div>
                                    <div className="table-cell">{item.medium || "-"}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="content-chevron">
                        <ChevronRightIcon />
                    </div>
                </div>
            )}

            {tab === 2 && (
                <div className="content-wrapper">
                    <div className="content">
                        <div className="followup-container">
                            <div className="followup-section">
                                <div className="followup-label">FOLLOWUP SCHEDULED ON</div>
                                <div className="followup-value">{lead.followup.scheduledOn}</div>
                            </div>
                            <div className="followup-section">
                                <div className="followup-label">FOLLOWUP REMARKS</div>
                                <div className="followup-value followup-remarks">{lead.followup.remarks}</div>
                            </div>
                        </div>
                    </div>

                    <div className="content-chevron">
                        <ChevronRightIcon />
                    </div>
                </div>
            )}
        </div>
    );
};

const Field = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}</span>
    <span className="field-value">{value || "-"}</span>
  </div>
);

const LeadCardContainer = () => {
  return (
    <div className="lead-cards-container">
      {LEadCardDataArray.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
};

export { LeadCard, LEadCardDataArray };
export default LeadCardContainer;