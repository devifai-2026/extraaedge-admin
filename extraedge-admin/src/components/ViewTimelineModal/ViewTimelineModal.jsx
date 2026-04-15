import { useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import HistoryIcon from "@mui/icons-material/History";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import "./ViewTimelineModal.css";

const ViewTimelineModal = ({ open, onClose, lead }) => {
  const [dateExpanded, setDateExpanded] = useState(true);

  if (!lead) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent className="timeline-modal">

        {/* Header */}
        <div className="timeline-header">
          <div className="timeline-title">{lead.name}</div>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Body */}
        <div className="timeline-body">

          {/* LEFT SIDE */}
          <div className="timeline-left">
            <div className="timeline-date">20 Mar 26</div>

            <div className="timeline-items">
              <div className="timeline-item">
                <div className="timeline-icon-wrap">
                  <FlagIcon className="timeline-icon flag-icon" />
                  <div className="timeline-line" />
                </div>
                <div>
                  <div className="time">12:55 PM</div>
                  <div className="text">Manually Added Activities</div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon-wrap">
                  <SwapHorizIcon className="timeline-icon status-icon" />
                  <div className="timeline-line" />
                </div>
                <div>
                  <div className="time">12:55 PM</div>
                  <div className="text">Status Change</div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon-wrap">
                  <HistoryIcon className="timeline-icon history-icon" />
                  <div className="timeline-line" />
                </div>
                <div>
                  <div className="time">12:55 PM</div>
                  <div className="text">History Change</div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon-wrap">
                  <FlagIcon className="timeline-icon flag-icon" />
                  <div className="timeline-line" />
                </div>
                <div>
                  <div className="time">10:19 AM</div>
                  <div className="text">Manually Added Activities</div>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon-wrap">
                  <SwapHorizIcon className="timeline-icon status-icon" />
                </div>
                <div>
                  <div className="time">10:19 AM</div>
                  <div className="text">Status Change</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="timeline-right">

            {/* Date Group Header */}
            <div
              className="date-group-header"
              onClick={() => setDateExpanded(!dateExpanded)}
            >
              <div className="date-group-left">
                <div className="date-group-circle" />
                <span className="date-group-text">Mar 20, 2026</span>
              </div>
              {dateExpanded ? (
                <KeyboardArrowUpIcon className="date-group-arrow" />
              ) : (
                <KeyboardArrowDownIcon className="date-group-arrow" />
              )}
            </div>

            {dateExpanded && (
              <div className="date-group-content">

                {/* Comment Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-card-icon-title">
                      <FlagIcon className="card-icon flag-card" />
                      <span className="timeline-card-title">Comment</span>
                    </div>
                    <span className="timeline-card-time">12:55 PM</span>
                  </div>
                  <div className="timeline-card-body">
                    <div className="timeline-card-row">
                      <ChatBubbleOutlineIcon className="card-meta-icon" />
                      <span>10th pass only</span>
                    </div>
                    <div className="timeline-card-row">
                      <PersonOutlineIcon className="card-meta-icon" />
                      <span>Divya Nair</span>
                    </div>
                  </div>
                </div>

                {/* Lead Status Changed Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-card-icon-title">
                      <SwapHorizIcon className="card-icon status-card" />
                      <span className="timeline-card-title">Lead Status changed from</span>
                    </div>
                    <span className="timeline-card-time">12:55 PM</span>
                  </div>
                  <div className="timeline-card-body">
                    <div className="timeline-card-row">
                      <span>03-Followup</span>
                      <span className="arrow">→</span>
                      <span>11-Junk</span>
                      <span className="duration">· 2 h 36 m</span>
                    </div>
                    <div className="timeline-card-row">
                      <PersonOutlineIcon className="card-meta-icon" />
                      <span>Divya Nair</span>
                    </div>
                  </div>
                </div>

                {/* Lead History Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-card-icon-title">
                      <HistoryIcon className="card-icon history-card" />
                      <span className="timeline-card-title">Lead History</span>
                    </div>
                    <span className="timeline-card-time">12:55 PM</span>
                  </div>
                  <div className="timeline-card-body">
                    <div className="history-list">
                      <div className="history-item">
                        <span className="history-number">1.</span>
                        <span>Updated the Stage from</span>
                      </div>
                      <div className="history-chips">
                        <Chip label="03-Followup" size="small" variant="outlined" />
                        <span className="arrow">→</span>
                        <Chip label="11-Junk" size="small" color="success" />
                      </div>

                      <div className="history-item">
                        <span className="history-number">2.</span>
                        <span>Updated the Sub-Stage from</span>
                      </div>
                      <div className="history-chips">
                        <Chip label="Asked to call later" size="small" variant="outlined" />
                        <span className="arrow">→</span>
                        <Chip label="Not Eligible" size="small" color="warning" />
                      </div>
                    </div>
                    <div className="timeline-card-row">
                      <PersonOutlineIcon className="card-meta-icon" />
                      <span>Divya Nair</span>
                    </div>
                  </div>
                </div>

                {/* Add Follow Up Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-card-icon-title">
                      <FlagIcon className="card-icon flag-card" />
                      <span className="timeline-card-title">Add Follow Up</span>
                    </div>
                    <span className="timeline-card-time">10:19 AM</span>
                  </div>
                  <div className="timeline-card-body">
                    <div className="timeline-card-row">
                      <ChatBubbleOutlineIcon className="card-meta-icon" />
                      <span>Incoming off</span>
                    </div>
                    <div className="timeline-card-row">
                      <PersonOutlineIcon className="card-meta-icon" />
                      <span>Divya Nair</span>
                    </div>
                    <div className="timeline-card-row">
                      <CalendarTodayIcon className="card-meta-icon" />
                      <span>Mar 21, 2026 06:56:00 am</span>
                    </div>
                  </div>
                </div>

                {/* Lead Status Will Be Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <div className="timeline-card-icon-title">
                      <SwapHorizIcon className="card-icon status-card" />
                      <span className="timeline-card-title">Lead status will be</span>
                    </div>
                    <span className="timeline-card-time">10:19 AM</span>
                  </div>
                  <div className="timeline-card-body">
                    <div className="timeline-card-row">
                      <span>03-Followup</span>
                    </div>
                    <div className="timeline-card-row">
                      <PersonOutlineIcon className="card-meta-icon" />
                      <span>Divya Nair</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewTimelineModal;
