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

const SMSTemplates = () => {
  const rows = [
    {
      name: "DefaultWelcomeSMS",
      body: "Thanks for your inquiry..."
    },
    {
      name: "VideocallInvite",
      body: "Hello %Lead.FullName%..."
    }
  ];

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
            <TableRow key={i}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.body}</TableCell>
              <TableCell>
                <Switch defaultChecked />
              </TableCell>
              <TableCell>
                <IconButton color="error">
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box className="fab-sms-templates">💬</Box>
    </Box>
  );
};

export default SMSTemplates;