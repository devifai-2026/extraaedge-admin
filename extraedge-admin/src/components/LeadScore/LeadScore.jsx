// LeadScore.jsx
import React, { useState } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import "./LeadScore.css";

const counselorFollowupData = {
  "Assign Lead": [{ name: "Lead Assigned", score: 2 }],
  Call: [
    { name: "Call Disposition", score: 0 },
    { name: "Inbound Call", score: 0 },
    { name: "Incoming Call", score: 3 },
    { name: "Incoming Call Hang up", score: 0 },
    { name: "Incoming Call Received", score: 0 },
    { name: "Missed Call", score: -1 },
    { name: "Missed Call", score: -1 },
    { name: "Missed IVR Call", score: -1 },
    { name: "Outbound Call", score: 0 },
    { name: "Outbound Call Hang Up", score: 0 },
    { name: "Outbound Call Received", score: 0 },
    { name: "Outgoing Call", score: 0 },
    { name: "Outgoing Call", score: 0 },
    { name: "Smart Caller Calling Activity", score: 0 }
  ],
  Email: [
    { name: "Attended zoom webinar", score: 5 },
    { name: "Delivery Report Alternate EmailId", score: 1 },
    { name: "Delivery Report Email", score: 6 },
    { name: "Delivery Report Father's EmailId", score: 0 },
    { name: "Delivery Report Mother's EmailId", score: 0 },
    { name: "Email", score: 0 },
    { name: "Email Escalation", score: 0 },
    { name: "Email Notification", score: 0 },
    { name: "Email Reminder", score: 3 },
    { name: "Send Email Failed", score: 0 },
    { name: "Send Referral Email", score: 0 },
    { name: "Send Report Email", score: 1 },
    { name: "Send Welcome Email", score: 0 },
    { name: "Send Email to Alternate EmailId", score: 0 },
    { name: "Send Email to Father's EmailId", score: 2 },
    { name: "Send Email to Mother's EmailId", score: 0 },

  ],
  Lead: [
    { name: "Email Extractor - Existing Lead Updated", score: 0 },
    { name: "Email Extractor - New Lead Created", score: 0 },
    { name: "Lead Closing Activity", score: 0 },
    { name: "Lead Referred", score: 0 },
    { name: "New Lead Created", score: 0 },
    { name: "Re-enquired", score: 4 }
  ],
  "Manually Added Activities": [
    { name: "Add Follow Up", score: 0 },
    { name: "Add Note", score: 0 },
    { name: "Comment", score: 0 },
    { name: "Document Reminder", score: 0 },
    { name: "Fee Follow-up", score: 0 },
    { name: "Follow Up Call", score: 0 },
    { name: "Schedule Registration", score: 0 },
    { name: "Schedule Walk-Ins", score: 0 },
    { name: "Send Prospectus", score: 0 }
  ],
  Payment: [
    { name: "Initiated Installment Payment From Appform", score: 0 },
    { name: "Initiated Payment", score: 0 },
    { name: "Installment Payment Done From Appform", score: 0 },
    { name: "Installment Payment Done From Link", score: 0 },
    { name: "Installment Payment Failed From Appform", score: 0 },
    { name: "Installment Payment Failed From Link", score: 0 },
    { name: "Installment Payment Link Sent", score: 0 },
    { name: "Payment Done", score: 0 },
    { name: "Payment Failed", score: 0 }
  ],
  "Refer As New Lead": [
    { name: "Refer As New Lead", score: 0 }
  ],
  "Sales Field": [
    { name: "Start Meeting With Lead", score: 0 },
    { name: "End Meeting With Lead", score: 0 }
  ],
  "Slot Booked": [
    { name: "Slot Booked", score: 0 }
  ],
  SMS: [
    { name: "Delivery Report Alternate Sms", score: 0 },
    { name: "Delivery Report Father's Sms", score: 0 },
    { name: "Delivery Report Mother's Sms", score: 0 },
    { name: "Delivery Report Sms", score: 0 },
    { name: "Send Referral Sms", score: 0 },
    { name: "Send Welcome Sms", score: 0 },
    { name: "Sent Sms to Alternate Mobile", score: 0 },
    { name: "Sent Sms to Fathers' Mobile", score: 0 },
    { name: "Sent Sms to Mothers' Mobile", score: 0 },
    { name: "SMS", score: 0 },
    { name: "Sms Escalation", score: 1 },
    { name: "Sms Notification", score: 1 },
    { name: "Sms Reminder", score: 1 }
  ],
  "Vidya AI Agent Calling": [
    { name: "AI Voice Bot Missed Raw Outbound Call", score: 0 },
    { name: "Outbound Call AI Voice Bot Hangup", score: 0 },
    { name: "Outbound Call AI Voice Bot Missed", score: 0 },
    { name: "Outbound Call AI Voice Bot Push Notification", score: 0 },
    { name: "Push To Raw AIVoiceBot", score: 0 }
  ],
  "VidyaGPT Action": [
    { name: "VidyaGPT Action - Application Started", score: 0 },
    { name: "VidyaGPT Action - Appointment Scheduled", score: 0 },
    { name: "VidyaGPT Action - Brochure Downloaded", score: 0 },
    { name: "VidyaGPT Action - Callback Requested", score: 0 },
    { name: "VidyaGPT Action - Eligibility Checked", score: 0 },
    { name: "VidyaGPT Action - Video Watched", score: 0 }
  ],
  WhatsApp: [
    { name: "Send Alternate Mobile WhatsApp Failed", score: 4 },
    { name: "Send Enterprise WhatsApp", score: 0 },
    { name: "Send Fathers Mobile WhatsApp Failed", score: 0 },
    { name: "Send Mothers Mobile WhatsApp Failed", score: 0 },
    { name: "Send Non-Enterprise WhatsApp", score: 0 },
    { name: "Send WhatsApp", score: 0 },
    { name: "Send WhatsApp Failed", score: 0 },
    { name: "Send WhatsApp to Alternate mobile", score: 0 },
    { name: "Send WhatsApp to Mothers mobile", score: 0 }
  ]
};

const prospectResponseData = {
  Email: [
    { name: "Bounce", score: -2 },
    { name: "Click", score: 4 },
    { name: "Deferred", score: 0 },
    { name: "Delivered", score: 1 },
    { name: "Dropped", score: -1 },
    { name: "Open", score: 2 },
    { name: "Processed", score: 0 }
  ],
  SMS: [
    { name: "BLOCKED", score: 0 },
    { name: "Delivered", score: 1 },
    { name: "Failed", score: -1 },
    { name: "Rejected", score: -1 }
  ],
  WhatsApp: [
    { name: "delivered", score: 0 },
    { name: "failed", score: 0 },
    { name: "read", score: 0 },
    { name: "Read and Responded", score: 0 },
    { name: "Read but not respond", score: 0 },
    { name: "sent", score: 0 }
  ]
};

const LeadScore = () => {
  const [subTab, setSubTab] = useState(0);

  const data = subTab === 0 ? counselorFollowupData : prospectResponseData;
  const sections = Object.keys(data);

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
        {sections.map((sec, i) => {
          const rows = data[sec] || [];
          return (
            <Accordion key={i} className="accordion-item-lead-score">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{sec}</Typography>
              </AccordionSummary>
              <AccordionDetails className="accordion-details-lead-score">
                <Box className="lead-score-table">
                  <Box className="lead-score-table-header">
                    <Box className="lead-score-cell name-cell">
                      COUNSELOR FOLLOWUP NAME
                    </Box>
                    <Box className="lead-score-cell score-cell">SCORE</Box>
                    <Box className="lead-score-cell action-cell">ACTION</Box>
                  </Box>
                  {rows.map((row, idx) => (
                    <Box
                      key={idx}
                      className={`lead-score-table-row ${idx % 2 === 1 ? "alt-row" : ""
                        }`}
                    >
                      <Box className="lead-score-cell name-cell">
                        {row.name}
                      </Box>
                      <Box className="lead-score-cell score-cell">
                        {row.score}
                      </Box>
                      <Box className="lead-score-cell action-cell">
                        <IconButton
                          size="small"
                          className="lead-score-edit-btn"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default LeadScore;
