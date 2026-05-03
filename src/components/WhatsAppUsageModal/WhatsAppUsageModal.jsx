import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./WhatsAppUsageModal.css";

const WhatsAppUsageModal = ({ open, onClose, data }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogContent className="wa-usage-modal">
        
        {/* Header */}
        <div className="wa-usage-header">
          <span>WhatsApp Messages</span>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Table */}
        <div className="wa-usage-table">
          <div className="wa-table-title">Count Stage</div>

          <table>
            <thead>
              <tr>
                <th></th>
                <th>Used</th>
                <th>Available</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {data?.map((item, index) => (
                <tr key={index}>
                  <td className="wa-first-col">{item.label}</td>
                  <td>{item.used}</td>
                  <td>{item.available}</td>
                  <td>{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppUsageModal;