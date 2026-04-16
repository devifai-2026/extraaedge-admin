// EmailTemplates.jsx
import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton,
  Chip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import "./EmailTemplates.css";

const data = [
  {
    name: "Appointment Email to Owner",
    subject: "Your Appointment Set with %Lead.FullName%",
    status: "Published"
  },
  {
    name: "Appointment Email to Lead",
    subject: "Your Appointment set with %Counselor.FullName% at extraadge",
    status: "Published"
  }
];

const EmailTemplates = () => {
  return (
    <Box className="table-container-email-templates">
      <Table>
        <TableHead>
          <TableRow className="table-header-email-templates">
            <TableCell>TEMPLATE NAME</TableCell>
            <TableCell>SUBJECT</TableCell>
            <TableCell>STAGE</TableCell>
            <TableCell>VISIBILITY</TableCell>
            <TableCell>ACTIONS</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i} className={i % 2 === 1 ? "row-alt-email" : ""}>
              <TableCell>
                <span className="template-link-email">{row.name}</span>
              </TableCell>
              <TableCell>{row.subject}</TableCell>
              <TableCell>
                <Chip label={row.status} size="small" className="chip-email-templates" />
              </TableCell>
              <TableCell>
                <Switch size="small" className="toggle-switch-email" />
              </TableCell>
              <TableCell>
                <IconButton size="small" className="action-icon-email">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" className="action-icon-delete-email">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Floating Button */}
      <Box className="fab-email-templates">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </Box>
    </Box>
  );
};

export default EmailTemplates;
