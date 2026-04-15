import React from "react";
import {
  Popper,
  Paper,
  IconButton,
  Button,
  Radio,
  ClickAwayListener
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import CancelIcon from "@mui/icons-material/Cancel";
import "./WhatsAppFilter.css";

const WhatsAppFilterModel = ({ anchorEl, open, onClose }) => {
  return (
    <Popper open={open} anchorEl={anchorEl} placement="bottom-end">
      <ClickAwayListener onClickAway={onClose}>
        <Paper className="filter-modal">
          
          {/* Header */}
          <div className="filter-header">
            <div className="filter-title">
              <FilterListIcon className="filter-icon" fontSize="small" />
              Filter
            </div>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>

          {/* Select Counselor */}
          <div className="filter-section">
            <div className="filter-label">Select Counselor</div>
            <div className="filter-chip">
              Divya Nair
              <CancelIcon className="chip-close" fontSize="small" />
            </div>
          </div>

          {/* WhatsApp Stage */}
          <div className="filter-section">
            <div className="filter-label">WhatsApp Message Stage</div>

            <div className="radio-item">
              <Radio size="small" />
              Unread by Counselor
            </div>

            <div className="radio-item">
              <Radio size="small" />
              Read by Counselor but not responded
            </div>

            <div className="radio-item">
              <Radio size="small" />
              Others
            </div>
          </div>

          {/* Session Expiry */}
          <div className="filter-section">
            <div className="filter-label">Session Expiry</div>

            <div className="session-grid">
              <div>
                <div className="input-label">Last Session Message From</div>
                <input className="time-input" placeholder="Time in hrs" />
              </div>

              <div>
                <div className="input-label">Last Session Message To</div>
                <input className="time-input" placeholder="Time in hrs" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="filter-footer">
            <Button variant="outlined">Reset</Button>
            <Button variant="contained" className="apply-btn">
              Apply Filter
            </Button>
          </div>

        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

export default WhatsAppFilterModel;