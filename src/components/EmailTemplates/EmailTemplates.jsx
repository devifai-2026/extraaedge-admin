// EmailTemplates.jsx
import React, { useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton,
  Chip,
  Dialog,
  DialogContent,
  Checkbox,
  Button
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import AddEmailTemplate from "../AddEmailTemplate/AddEmailTemplate";
import AddBasicEmailTemplate from "../AddBasicEmailTemplate/AddBasicEmailTemplate";
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
  const [open, setOpen] = useState(false);
  const [builderType, setBuilderType] = useState("advanced");
  const [activeBuilder, setActiveBuilder] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleContinue = () => {
    setOpen(false);
    setActiveBuilder(builderType);
  };

  if (activeBuilder === "advanced") {
    return <AddEmailTemplate onBack={() => setActiveBuilder(null)} />;
  }

  if (activeBuilder === "basic") {
    return <AddBasicEmailTemplate onBack={() => setActiveBuilder(null)} />;
  }

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
      <Box className="fab-email-templates" onClick={handleOpen}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </Box>

      {/* Template Builder Type Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent className="template-builder-modal">
          <div className="template-builder-header">
            <span>Select Type of Template Builder</span>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className="template-builder-body">
            <p className="template-builder-instruction">
              To create a new template, please choose one of template builder from below options:
            </p>

            <div className="template-builder-options">
              <label className="template-builder-option">
                <Checkbox
                  checked={builderType === "advanced"}
                  onChange={() => setBuilderType("advanced")}
                  className="template-builder-checkbox"
                />
                <span>Advanced Template Builder</span>
              </label>

              <label className="template-builder-option">
                <Checkbox
                  checked={builderType === "basic"}
                  onChange={() => setBuilderType("basic")}
                  className="template-builder-checkbox"
                />
                <span>Basic HTML Template Builder</span>
              </label>
            </div>

            <hr className="template-builder-divider" />

            <h4 className="template-builder-title">Drag &amp; Drop Email Template Builder</h4>
            <ul className="template-builder-list">
              <li>Drag and drop feature helps in creating different designs with minimum effort</li>
              <li>Best fit for creating attractive email templates</li>
              <li>Create professional and mobile responsive email templates fast</li>
              <li>Use tokens to add personalization to your emails</li>
            </ul>
          </div>

          <div className="template-builder-footer">
            <Button className="template-builder-cancel" onClick={handleClose}>
              Cancel
            </Button>
            <Button className="template-builder-continue" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EmailTemplates;
