import React, { useState } from "react";
import {
  IconButton,
  Pagination,
} from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import RefreshIcon from "@mui/icons-material/Refresh";
import CallIcon from "@mui/icons-material/Call";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PhoneIcon from "@mui/icons-material/Phone";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import "./WhatAppsList.css";
import { colors } from "../../theme/colors";
import AddNewLead from "../../components/AddNewLead/AddNewLead";
import WhatsAppFilterModel from "../../components/WhatsAppFilter/WhatsAppFilter";
import WhatsAppUsageModal from "../../components/WhatsAppUsageModal/WhatsAppUsageModal";
import EmailDrawer from "../../components/EmailDrawer/EmailDrawer";
import WhatsAppSendModal from "../../components/WhatsAppSendModal/WhatsAppSendModal";

const whatsAppLeads = [
  {
    id: 1,
    name: "Sanju",
    phone: "9109086261",
    stage: "11-Junk",
    subStage: "Not Eligible",
    source: "",
    program: "",
    subStageFull: "Not Eligible",
    leadAddedOn: "Mar 20, 2026 7:22 AM",
    lastUpdatedOn: "Apr 13, 2026 11:23 AM",
    followupScheduledOn: "",
    previousLeadOwner: "",
    currentLeadOwner: "Divya Nair",
    followupComment: "",
    leadSelectionScore: "",
    category: "Lead",
  },
  {
    id: 2,
    name: "Ms.Gupta",
    phone: "8286620640",
    stage: "12-Cold",
    subStage: "Not Intereste...",
    source: "",
    program: "",
    subStageFull: "Not Interested",
    leadAddedOn: "Feb 10, 2026 9:15 AM",
    lastUpdatedOn: "Apr 12, 2026 3:45 PM",
    followupScheduledOn: "",
    previousLeadOwner: "Rajesh Kumar",
    currentLeadOwner: "Priya Sharma",
    followupComment: "",
    leadSelectionScore: "",
    category: "Lead",
  },
  {
    id: 3,
    name: "Shrawani Madankar",
    phone: "7972735661",
    stage: "12-Cold",
    subStage: "Not Intereste...",
    source: "",
    program: "",
    subStageFull: "Not Interested",
    leadAddedOn: "Jan 15, 2026 11:30 AM",
    lastUpdatedOn: "Apr 11, 2026 2:20 PM",
    followupScheduledOn: "",
    previousLeadOwner: "Amit Patel",
    currentLeadOwner: "Neha Gupta",
    followupComment: "",
    leadSelectionScore: "",
    category: "Lead",
  },
  {
    id: 4,
    name: "Bhagyashri",
    phone: "9767215382",
    stage: "03-Followup",
    subStage: "Asked to call ...",
    source: "",
    program: "",
    subStageFull: "Asked to call back",
    leadAddedOn: "Mar 5, 2026 4:00 PM",
    lastUpdatedOn: "Apr 10, 2026 10:15 AM",
    followupScheduledOn: "Apr 15, 2026 11:00 AM",
    previousLeadOwner: "Vikram Singh",
    currentLeadOwner: "Anjali Verma",
    followupComment: "Will call back after exam",
    leadSelectionScore: "75",
    category: "Lead",
  },
  {
    id: 5,
    name: "PRASAD SANJAY SAWANT",
    phone: "7058469175",
    stage: "12-Cold",
    subStage: "Not Intereste...",
    source: "",
    program: "",
    subStageFull: "Not Interested",
    leadAddedOn: "Dec 20, 2025 8:00 AM",
    lastUpdatedOn: "Apr 9, 2026 5:30 PM",
    followupScheduledOn: "",
    previousLeadOwner: "Sanjana Iyer",
    currentLeadOwner: "Karthik Mehta",
    followupComment: "",
    leadSelectionScore: "",
    category: "Lead",
  },
];

const waUsageData = [
  {
    label: "Monthly Business Initiated Messages",
    used: 0,
    available: 3000,
    total: 3000,
  },
  {
    label: "Daily Business Initiated Messages",
    used: 0,
    available: 100,
    total: 100,
  },
  {
    label: "Monthly Session Messages",
    used: 0,
    available: 6000,
    total: 6000,
  },
  {
    label: "Daily Session Messages",
    used: 0,
    available: 200,
    total: 200,
  },
];

const getStageColor = (stage) => {
  if (stage.includes("Junk")) return colors.darkGrey;
  if (stage.includes("Cold")) return colors.darkGrey;
  if (stage.includes("Followup")) return colors.success;
  return colors.darkGrey;
};

const WhatsAppCard = ({ lead, onOpenLead }) => {
  const [expanded, setExpanded] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openWA, setOpenWA] = useState(false);

  return (
    <div className="wa-card">
      <div className="wa-card-header">
        <div className="wa-card-left">
          <div className="wa-card-name">{lead.name}</div>
          <div className="wa-card-phone">{lead.phone}</div>
        </div>

        <div className="wa-card-stage">
          <span
            className="wa-stage-badge"
            style={{ backgroundColor: getStageColor(lead.stage) }}
          >
            {lead.stage}
          </span>
          <span className="wa-sub-stage">{lead.subStage}</span>
        </div>

        <div className="wa-card-actions">
          <span className="wa-action-link" onClick={() => onOpenLead(lead)} style={{ cursor: "pointer" }}>
            <OpenInNewIcon className="wa-action-icon" />
            Open Lead
          </span>
          <span className="wa-action-divider">|</span>
          <span className="wa-action-link">
            <VisibilityIcon className="wa-action-icon" />
            View All Timeline
          </span>
        </div>

        <div className="wa-card-icons">
          <IconButton size="small" className="wa-icon-btn">
            <CallIcon />
          </IconButton>
          <IconButton
            size="small"
            className="wa-icon-btn"
            onClick={() => setOpenEmail(true)}
          >
            <MailOutlineIcon />
          </IconButton>
          <IconButton
            size="small"
            className="wa-icon-btn"
            onClick={() => setOpenWA(true)}
          >
            <WhatsAppIcon />
          </IconButton>
        </div>

        <IconButton
          size="small"
          className="wa-expand-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>

        <EmailDrawer
          open={openEmail}
          onClose={() => setOpenEmail(false)}
          lead={lead}
        />

        <WhatsAppSendModal
          open={openWA}
          onClose={() => setOpenWA(false)}
          data={{
            lead: lead,              // 👈 current card lead
            usage: waUsageData,      // 👈 your existing data
            templates: [
              {
                id: 1,
                name: "Welcome Template",
                message: `Hi ${lead.name}, welcome to our service!`
              },
              {
                id: 2,
                name: "Follow-up Template",
                message: `Hi ${lead.name}, just following up with you.`
              }
            ]
          }}
        />
      </div>

      {expanded && (
        <div className="wa-card-details">
          <div className="wa-details-grid">
            <div className="wa-detail-item">
              <span className="wa-detail-label">SOURCE</span>
              <span className="wa-detail-value">{lead.source || "-"}</span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">PROGRAM</span>
              <span className="wa-detail-value">{lead.program || "-"}</span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">SUB-STAGE</span>
              <span className="wa-detail-value">
                {lead.subStageFull || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">LEAD ADDED ON</span>
              <span className="wa-detail-value">
                {lead.leadAddedOn || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">LAST UPDATED ON</span>
              <span className="wa-detail-value">
                {lead.lastUpdatedOn || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">FOLLOWUP SCHEDULED ON</span>
              <span className="wa-detail-value">
                {lead.followupScheduledOn || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">PREVIOUS LEAD OWNER</span>
              <span className="wa-detail-value">
                {lead.previousLeadOwner || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">CURRENT LEAD OWNER</span>
              <span className="wa-detail-value">
                {lead.currentLeadOwner || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">FOLLOWUP COMMENT</span>
              <span className="wa-detail-value">
                {lead.followupComment || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">LEAD SELECTION SCORE</span>
              <span className="wa-detail-value">
                {lead.leadSelectionScore || "-"}
              </span>
            </div>
            <div className="wa-detail-item">
              <span className="wa-detail-label">CATEGORY</span>
              <span className="wa-detail-value">{lead.category || "-"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WhatsAppList = () => {
  const [page, setPage] = useState(1);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [waModalOpen, setWaModalOpen] = useState(false);

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseFilter = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const handleOpenLead = (lead) => {
    setSelectedLead(lead);
    setEditLeadOpen(true);
  };

  const handleEditLeadClose = () => {
    setEditLeadOpen(false);
    setSelectedLead(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="wa-container">
      <div className="wa-header">
        <h2 className="wa-title">WhatsApp Chat</h2>
        <div className="wa-header-icons">
          <IconButton
            size="small"
            className="wa-header-icon"
            onClick={handleFilterClick}
          >
            <FilterAltIcon />
          </IconButton>
          <IconButton
            size="small"
            className="wa-header-icon wa-badge-icon"
            onClick={() => setWaModalOpen(true)}
          >
            <WhatsAppIcon />
            <span className="wa-notification-badge">3</span>
          </IconButton>
          <IconButton size="small" className="wa-header-icon" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </div>
      </div>

      <div className="wa-cards-list">
        {whatsAppLeads.map((lead) => (
          <WhatsAppCard key={lead.id} lead={lead} onOpenLead={handleOpenLead} />
        ))}
      </div>

      <div className="wa-pagination">
        <Pagination
          count={13}
          page={page}
          onChange={(e, value) => setPage(value)}
          shape="rounded"
          siblingCount={3}
          boundaryCount={1}
          sx={{
            "& .MuiPaginationItem-root": {
              color: colors.textSecondary,
              fontSize: "14px",
              minWidth: "32px",
              height: "32px",
            },
            "& .Mui-selected": {
              backgroundColor: `${colors.primary} !important`,
              color: `${colors.white} !important`,
            },
          }}
        />
      </div>

      <AddNewLead
        open={editLeadOpen}
        onClose={handleEditLeadClose}
        leadData={selectedLead}
      />

      <WhatsAppFilterModel
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseFilter}
      />

      <WhatsAppUsageModal
        open={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        data={waUsageData}
      />
    </div>
  );
};

export default WhatsAppList;
