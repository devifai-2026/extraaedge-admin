// LeadScore.jsx
import React, { useState } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./LeadScore.css";

const sections = [
  "Assign Lead",
  "Call",
  "Email",
  "Lead",
  "Manually Added Activities",
  "Payment",
  "Refer As New Lead",
  "Sales Field"
];

const LeadScore = () => {
  const [subTab, setSubTab] = useState(0);

  return (
    <Box className="lead-score-container">
      {/* Sub-tabs */}
      <Box className="lead-score-sub-tabs">
        <span
          className={subTab === 0 ? "lead-score-sub-tab active" : "lead-score-sub-tab"}
          onClick={() => setSubTab(0)}
        >
          Counselor Followup
        </span>
        <span
          className={subTab === 1 ? "lead-score-sub-tab active" : "lead-score-sub-tab"}
          onClick={() => setSubTab(1)}
        >
          Prospect Response
        </span>
      </Box>

      {/* Accordions */}
      <Box className="accordion-container-lead-score">
        {sections.map((sec, i) => (
          <Accordion key={i} className="accordion-item-lead-score">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{sec}</Typography>
            </AccordionSummary>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export default LeadScore;
