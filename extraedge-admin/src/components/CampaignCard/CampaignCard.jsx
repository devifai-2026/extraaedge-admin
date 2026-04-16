import React, { useState } from "react";
import { IconButton, Collapse } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import GroupIcon from "@mui/icons-material/Group";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { colors } from "../../theme/colors";

const BulkCampaignCard = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("processing");

  return (
    <div className="bulk-campaign-card">

      {/* ── HEADER ROW ── */}
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
            <GroupIcon sx={{ color: colors.primary, fontSize: 22, cursor: "pointer" }} />
            <StopCircleOutlinedIcon sx={{ color: colors.primary, fontSize: 22, cursor: "pointer" }} />
            <PersonAddAltIcon sx={{ color: colors.primary, fontSize: 22, cursor: "pointer" }} />
            <IconButton size="small" onClick={() => setIsOpen((prev) => !prev)}>
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </div>
        </div>
      </div>

      {/* ── EXPANDED SECTION ── */}
      <Collapse in={isOpen}>
        <div className="bulk-expand-section">

          {/* Stats summary */}
          <div className="bulk-stats-row">
            <div className="bulk-stat-item">
              <span className="bulk-stat-label">LEAD/APPLICANT COUNT</span>
              <p className="bulk-stat-value">{item.stats?.leads ?? 0}</p>
            </div>
            <div className="bulk-stat-item">
              <span className="bulk-stat-label">EMAIL ID COUNT</span>
              <p className="bulk-stat-value">{item.stats?.email ?? 0}</p>
            </div>
            <div className="bulk-stat-item">
              <span className="bulk-stat-label">WHATSAPP NO COUNT</span>
              <p className="bulk-stat-value">{item.stats?.whatsapp ?? 0}</p>
            </div>
            <div className="bulk-stat-item">
              <span className="bulk-stat-label">MOBILE NO COUNT</span>
              <p className="bulk-stat-value orange">{item.stats?.mobile ?? 0}</p>
            </div>
          </div>

          <div className="bulk-stat-item bulk-times-row">
            <span className="bulk-stat-label">NO OF TIMES OF COMMUNICATION</span>
            <p className="bulk-stat-value">{item.stats?.times ?? 0}</p>
          </div>

          <div className="bulk-divider" />

          {/* Tabs */}
          <div className="bulk-tabs">
            {["processing", "response"].map((tab) => (
              <span
                key={tab}
                className={`bulk-tab-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "processing" ? "PROCESSING STATUS" : "USER RESPONSE STATUS"}
              </span>
            ))}
          </div>

          {/* User Response Status tab content */}
          {activeTab === "response" && (
            <div className="bulk-processing-section">
              <p className="bulk-note">
                <InfoOutlinedIcon sx={{ fontSize: 16, marginRight: "4px", verticalAlign: "middle" }} />
                Note that the Email and WA responses need more time to process. The responses will continue to be updated as more students open, click email or see WA messages.
              </p>

              {/* Email response row */}
              <div className="bulk-delivery-row bulk-delivery-row--four">
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL DELIVERED &amp; OPENED</span>
                  <p className="bulk-stat-value">{item.stats?.emailDeliveredOpened ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL DELIVERED &amp; CLICKED</span>
                  <p className="bulk-stat-value">{item.stats?.emailDeliveredClicked ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL DROPPED</span>
                  <p className="bulk-stat-value">{item.stats?.emailDropped ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL BOUNCED</span>
                  <p className="bulk-stat-value">{item.stats?.emailBounced ?? 0}</p>
                </div>
              </div>

              <div className="bulk-delivery-divider" />

              {/* WhatsApp response row */}
              <div className="bulk-delivery-row">
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">WHATSAPP DELIVERED &amp; SEEN</span>
                  <p className="bulk-stat-value">{item.stats?.waDeliveredSeen ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing tab content */}
          {activeTab === "processing" && (
            <div className="bulk-processing-section">
              <p className="bulk-note">
                <InfoOutlinedIcon sx={{ fontSize: 16, marginRight: "4px", verticalAlign: "middle" }} />
                Note that the below numbers will provide a quick summary of the delivery rate of the campaigns.
              </p>

              {/* Email */}
              <div className="bulk-delivery-row">
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">SUBSCRIBED EMAIL TRIGGERED</span>
                  <p className="bulk-stat-value">{item.stats?.subscribedEmailTriggered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.emailDelivered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">EMAIL NOT DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.emailNotDelivered ?? 0}</p>
                </div>
              </div>

              <div className="bulk-delivery-divider" />

              {/* WhatsApp */}
              <div className="bulk-delivery-row">
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">SUBSCRIBED WHATSAPP TRIGGERED</span>
                  <p className="bulk-stat-value">{item.stats?.subscribedWhatsappTriggered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">WHATSAPP DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.waDelivered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">WHATSAPP NOT DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.waNotDelivered ?? 0}</p>
                </div>
              </div>

              <div className="bulk-delivery-divider" />

              {/* SMS */}
              <div className="bulk-delivery-row">
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">SMS TRIGGERED</span>
                  <p className="bulk-stat-value">{item.stats?.smsTriggered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">SMS DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.smsDelivered ?? 0}</p>
                </div>
                <div className="bulk-delivery-item">
                  <span className="bulk-stat-label">SMS NOT DELIVERED</span>
                  <p className="bulk-stat-value">{item.stats?.smsNotDelivered ?? 0}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </Collapse>

    </div>
  );
};

export default BulkCampaignCard;
