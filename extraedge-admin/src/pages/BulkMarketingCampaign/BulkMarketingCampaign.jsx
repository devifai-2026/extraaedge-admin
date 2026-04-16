import React, { useState } from "react";
import { IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ViewListIcon from "@mui/icons-material/ViewList";
import BulkCampaignCard from "../../components/CampaignCard/CampaignCard";
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
      smsNotDelivered: 0,
      emailDeliveredOpened: 0,
      emailDeliveredClicked: 0,
      emailDropped: 0,
      emailBounced: 0,
      waDeliveredSeen: 21,
    },
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
      leads: 0, 
      email: 0, 
      whatsapp: 0, 
      mobile: 0, 
      times: 0,
      subscribedEmailTriggered: 0,
       emailDelivered: 0, 
       emailNotDelivered: 0,
      subscribedWhatsappTriggered: 0,
       waDelivered: 0,
        waNotDelivered: 1,
      smsTriggered: 0,
       smsDelivered: 0,
        smsNotDelivered: 1,
        emailDeliveredOpened: 0,
      emailDeliveredClicked: 0,
      emailDropped: 0,
      emailBounced: 0,
      waDeliveredSeen: 2,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
      emailDeliveredOpened: 0,
      emailDeliveredClicked: 0,
      emailDropped: 0,
      emailBounced: 0,
      waDeliveredSeen: 9,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
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
      smsTriggered: 0, smsDelivered: 0, smsNotDelivered: 0,
    },
  },
];

const ITEMS_PER_PAGE = 8;

const BulkCampaignContent = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(campaignData.length / ITEMS_PER_PAGE);
  const paginatedData = campaignData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bulk-content-wrapper">

      {/* Top bar */}
      <div className="bulk-top-bar">
        <div className="bulk-tab-active">All Bulk Communications (39)</div>
        <div className="bulk-top-actions">
          <IconButton size="small"><RefreshIcon sx={{ color: "#f37021" }} /></IconButton>
          <IconButton size="small"><ViewListIcon sx={{ color: "#f37021" }} /></IconButton>
          <IconButton size="small"><FilterListIcon sx={{ color: "#f37021" }} /></IconButton>
        </div>
      </div>

      {/* Cards — each card manages its own open/tab state */}
      {paginatedData.map((item) => (
        <BulkCampaignCard key={item.id} item={item} />
      ))}

      {/* Pagination */}
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
