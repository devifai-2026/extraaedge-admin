// SMSTemplates.jsx
import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import "./SMSTemplates.css";

const rows = [
  {
    name: "DefaultWelComeSMS",
    body: "Thanks for your inquiry. We will get in touch with you shortly.",
    visible: true
  },
  {
    name: "VideocallInvite",
    body: "Hello %Lead.FullName%, %Counselor.FullName% from Speedup Infotech, Pune is inviting you for the video conferen...",
    visible: true
  },
  {
    name: "Appointment SMS to Owner",
    body: "Dear %Counselor.FullName%. Your appointment is set with %Lead.FullName% %Lead.Email% %Lead.ContactNumber%...",
    visible: false
  },
  {
    name: "Appointment SMS to Lead",
    body: "Dear %Lead.FullName% %Lead.FirstName% %Lead.LastName% Your appointment is set with %Counselor.FirstName% ...",
    visible: true
  },
  {
    name: "Zoom Test SMS Template",
    body: "Hello %Lead.AccountActivationURL%, %Lead.Email% from Speedup Infotech, Pune is inviting you for Zoom webinar c...",
    visible: true
  }
];

const SMSTemplates = () => {
  return (
    <Box className="table-container-sms-templates">
      <Table>
        <TableHead>
          <TableRow className="table-header-sms-templates">
            <TableCell>TEMPLATE NAME</TableCell>
            <TableCell>SMS BODY</TableCell>
            <TableCell>VISIBILITY</TableCell>
            <TableCell>ACTIONS</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className={i % 2 === 1 ? "row-alt-sms" : ""}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.body}</TableCell>
              <TableCell>
                <Switch
                  size="small"
                  defaultChecked={row.visible}
                  className="toggle-switch-sms"
                />
              </TableCell>
              <TableCell>
                <IconButton size="small" className="action-icon-delete-sms">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box className="fab-sms-templates">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </Box>
    </Box>
  );
};

export default SMSTemplates;
