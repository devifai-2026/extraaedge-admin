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
    subject: "Your Appointment set with %Counselor.FullName%",
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
            <TableRow key={i}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.subject}</TableCell>
              <TableCell>
                <Chip label="Published" size="small" className="chip-email-templates" />
              </TableCell>
              <TableCell>
                <Switch defaultChecked />
              </TableCell>
              <TableCell>
                <IconButton>
                  <ContentCopyIcon />
                </IconButton>
                <IconButton color="error">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Floating Button */}
      <Box className="fab-email-templates">✉️</Box>
    </Box>
  );
};

export default EmailTemplates;