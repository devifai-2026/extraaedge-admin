// LeadScore.jsx
import React from "react";
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
  return (
    <Box className="accordion-container-lead-score">
      {sections.map((sec, i) => (
        <Accordion key={i}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{sec}</Typography>
          </AccordionSummary>
        </Accordion>
      ))}
    </Box>
  );
};

export default LeadScore;