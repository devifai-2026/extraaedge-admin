// AssignmentRules.jsx
import React from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import "./AssignmentRules.css";

const AssignmentRules = () => {
  return (
    <Box className="assignment-container-rules">
      {/* Top actions */}
      <Box className="top-actions-rules">
        <IconButton className="refresh-btn-rules">
          <RefreshIcon />
        </IconButton>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          className="filter-btn-rules"
        >
          Filter
        </Button>
        <Button
          variant="contained"
          className="add-rule-btn-rules"
        >
          Add Rule
        </Button>
        <IconButton size="small">
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Table */}
      <Box className="table-wrapper-rules">
        <Table>
          <TableHead>
            <TableRow className="table-header-rules">
              <TableCell>Rule Name</TableCell>
              <TableCell>Created On</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Assigned Counselors</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody />
        </Table>

        {/* Empty state */}
        <Box className="empty-state-rules">
          <Box className="empty-state-icon-rules">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" fill="#fde8d8" />
              <circle cx="50" cy="50" r="35" fill="#f5f5f5" stroke="#999" strokeWidth="2" />
              <line x1="75" y1="75" x2="92" y2="92" stroke="#999" strokeWidth="4" strokeLinecap="round" />
              <circle cx="40" cy="45" r="3" fill="#999" />
              <circle cx="60" cy="45" r="3" fill="#999" />
              <path d="M38 60 Q50 53 62 60" stroke="#999" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </Box>
          <Typography variant="h6" className="empty-state-title-rules">
            No search result found
          </Typography>
          <Typography variant="body2" className="empty-state-text-rules">
            We cannot find what you were looking for. Try searching something else.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default AssignmentRules;
