import React, { useState } from "react";
import {
  IconButton,
  Collapse
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewListIcon from "@mui/icons-material/ViewList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import GroupIcon from "@mui/icons-material/Group";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import "./BulkMarketingCampaign.css";

const campaignData = [
  {
    id: 1,
    name: "Shriraj",
    stage: "COMPLETED",
    createdOn: "Apr 13, 2026 3:35 PM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Apr 13, 2026 4:34 PM",
    rule: "Based on selected ca...",
    stats: {
      leads: 66,
      email: 0,
      whatsapp: 66,
      mobile: 0,
      times: 1,
      subscribedEmailTriggered: 0,
      emailDelivered: 0,
      emailNotDelivered: 0,
      subscribedWhatsappTriggered: 66,
      waDelivered: 51,
      waNotDelivered: 15,
      smsTriggered: 0,
      smsDelivered: 0,
      smsNotDelivered: 0
    }
  },
  {
    id: 2,
    name: "Shriraj",
    stage: "STOPPED",
    createdOn: "Mar 3, 2026 4:20 PM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Mar 3, 2026 4:20 PM",
    rule: "Based on selected ca...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 3,
    name: "BulkCommunication_...",
    stage: "COMPLETED",
    createdOn: "Jan 19, 2026 10:09 PM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 19, 2026 10:11 PM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 4,
    name: "BulkCommunication_...",
    stage: "COMPLETED",
    createdOn: "Jan 19, 2026 10:09 PM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 19, 2026 10:11 PM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 5,
    name: "BulkCommunication_...",
    stage: "COMPLETED",
    createdOn: "Jan 19, 2026 10:08 PM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 19, 2026 10:10 PM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 6,
    name: "New leads",
    stage: "COMPLETED",
    createdOn: "Jan 15, 2026 11:15 AM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 15, 2026 11:19 AM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 7,
    name: "New leads",
    stage: "COMPLETED",
    createdOn: "Jan 15, 2026 11:16 AM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 15, 2026 11:19 AM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 8,
    name: "New Batch",
    stage: "COMPLETED",
    createdOn: "Jan 7, 2026 11:16 AM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 7, 2026 12:35 PM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 9,
    name: "BulkCommunication_...",
    stage: "COMPLETED",
    createdOn: "Jan 7, 2026 11:12 AM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 7, 2026 11:14 AM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  },
  {
    id: 10,
    name: "Engaged",
    stage: "COMPLETED",
    createdOn: "Jan 7, 2026 11:11 AM",
    createdBy: "Abhijeet Salgar",
    updatedOn: "Jan 7, 2026 11:13 AM",
    rule: "Based on No. of days...",
    stats: {
      leads: 0, email: 0, whatsapp: 0, mobile: 0, times: 0,
      subscribedEmailTriggered: 0, emailDelivered: 0, emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0, waDelivered: 0, waNotDelivered: 0,
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0
    }
  }
];

const ITEMS_PER_PAGE = 8;

const BulkCampaignContent = () => {
  const [openRow, setOpenRow] = useState(null);
  const [activeTab, setActiveTab] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(campaignData.length / ITEMS_PER_PAGE);
  const paginatedData = campaignData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getActiveTab = (id) => activeTab[id] || "processing";

  return (
    <div className="bulk-content-wrapper">

      {/* TOP BAR */}
      <div className="bulk-top-bar">
        <div className="bulk-tab-active">All Bulk Communications (39)</div>
        <div className="bulk-top-actions">
          <IconButton size="small"><RefreshIcon sx={{ color: "#f37021" }} /></IconButton>
          <IconButton size="small"><ViewListIcon sx={{ color: "#f37021" }} /></IconButton>
          <IconButton size="small"><FilterListIcon sx={{ color: "#f37021" }} /></IconButton>
        </div>
      </div>

      {/* LIST */}
      {paginatedData.map((item) => (
        <div className="bulk-campaign-card" key={item.id}>

          <div className="bulk-campaign-row">
            <div className="bulk-col">
              <p className="bulk-label">CAMPAIGN</p>
              <p className="bulk-value">{item.name}</p>
            </div>

            <div className="bulk-col">
              <p className="bulk-label">STAGE</p>
              <p className="bulk-status">
                <span className={`bulk-dot ${item.stage === "STOPPED" ? "blue" : "green"}`} />
                {item.stage}
              </p>
            </div>

            <div className="bulk-col">
              <p className="bulk-label">CREATED ON</p>
              <p className="bulk-value">{item.createdOn}</p>
            </div>

            <div className="bulk-col">
              <p className="bulk-label">CREATED BY</p>
              <p className="bulk-value">{item.createdBy}</p>
            </div>

            <div className="bulk-col">
              <p className="bulk-label">UPDATED ON</p>
              <p className="bulk-value">{item.updatedOn}</p>
            </div>

            <div className="bulk-col">
              <p className="bulk-label">RULE</p>
              <p className="bulk-value">{item.rule}</p>
            </div>

            <div className="bulk-col-actions">
              <p className="bulk-label">ACTIONS</p>
              <div className="bulk-row-actions">
                <GroupIcon sx={{ color: "#f37021", fontSize: 22, cursor: "pointer" }} />
                <StopCircleOutlinedIcon sx={{ color: "#f37021", fontSize: 22, cursor: "pointer" }} />
                <PersonAddAltIcon sx={{ color: "#f37021", fontSize: 22, cursor: "pointer" }} />
                <IconButton
                  size="small"
                  onClick={() => setOpenRow(openRow === item.id ? null : item.id)}
                >
                  {openRow === item.id
                    ? <KeyboardArrowUpIcon />
                    : <KeyboardArrowDownIcon />}
                </IconButton>
              </div>
            </div>
          </div>

          {/* EXPANDED SECTION */}
          <Collapse in={openRow === item.id}>
            <div className="bulk-expand-section">

              {/* STATS ROW */}
              <div className="bulk-stats-row">
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">LEAD/APPLICANT COUNT</span>
                  <p className="bulk-stat-value">{item.stats?.leads || 0}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">EMAIL ID COUNT</span>
                  <p className="bulk-stat-value">{item.stats?.email || 0}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">WHATSAPP NO COUNT</span>
                  <p className="bulk-stat-value">{item.stats?.whatsapp || 0}</p>
                </div>
                <div className="bulk-stat-item">
                  <span className="bulk-stat-label">MOBILE NO COUNT</span>
                  <p className="bulk-stat-value orange">{item.stats?.mobile || 0}</p>
                </div>
              </div>

              <div className="bulk-stat-item bulk-times-row">
                <span className="bulk-stat-label">NO OF TIMES OF COMMUNICATION</span>
                <p className="bulk-stat-value">{item.stats?.times || 0}</p>
              </div>

              <div className="bulk-divider" />

              {/* TABS */}
              <div className="bulk-tabs">
                <span
                  className={`bulk-tab-item ${getActiveTab(item.id) === "processing" ? "active" : ""}`}
                  onClick={() => setActiveTab({ ...activeTab, [item.id]: "processing" })}
                >
                  PROCESSING STATUS
                </span>
                <span
                  className={`bulk-tab-item ${getActiveTab(item.id) === "response" ? "active" : ""}`}
                  onClick={() => setActiveTab({ ...activeTab, [item.id]: "response" })}
                >
                  USER RESPONSE STATUS
                </span>
              </div>

              {getActiveTab(item.id) === "processing" && (
                <div className="bulk-processing-section">
                  <p className="bulk-note">
                    <InfoOutlinedIcon sx={{ fontSize: 16, marginRight: "4px", verticalAlign: "middle" }} />
                    Note that the below numbers will provide a quick summary of the delivery rate of the campaigns.
                  </p>

                  {/* EMAIL ROW */}
                  <div className="bulk-delivery-row">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SUBSCRIBED EMAIL TRIGGERED</span>
                      <p className="bulk-stat-value">{item.stats?.subscribedEmailTriggered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.emailDelivered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">EMAIL NOT DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.emailNotDelivered || 0}</p>
                    </div>
                  </div>

                  <div className="bulk-delivery-divider" />

                  {/* WHATSAPP ROW */}
                  <div className="bulk-delivery-row">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SUBSCRIBED WHATSAPP TRIGGERED</span>
                      <p className="bulk-stat-value">{item.stats?.subscribedWhatsappTriggered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">WHATSAPP DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.waDelivered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">WHATSAPP NOT DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.waNotDelivered || 0}</p>
                    </div>
                  </div>

                  <div className="bulk-delivery-divider" />

                  {/* SMS ROW */}
                  <div className="bulk-delivery-row">
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS TRIGGERED</span>
                      <p className="bulk-stat-value">{item.stats?.smsTriggered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.smsDelivered || 0}</p>
                    </div>
                    <div className="bulk-delivery-item">
                      <span className="bulk-stat-label">SMS NOT DELIVERED</span>
                      <p className="bulk-stat-value">{item.stats?.smsNotDelivered || 0}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Collapse>

        </div>
      ))}

      {/* PAGINATION */}
      <div className="bulk-pagination">
        <span
          className="bulk-page-arrow"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        >
          {"<"}
        </span>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <span
            key={page}
            className={`bulk-page-num ${currentPage === page ? "active" : ""}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </span>
        ))}
        <span
          className="bulk-page-arrow"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        >
          {">"}
        </span>
      </div>

    </div>
  );
};

export default BulkCampaignContent;
