import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  IconButton,
  Menu,
  MenuItem,
  Fab,
  Paper
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import { colors } from "../../theme/colors";
import "./AutomationWorkflow.css";

const rowsData = [
  {
    name: "WDay2026",
    category: "Send immediate communication",
    createdBy: "Abhijeet Salgar",
    createdOn: "Mar 7, 2026 10:42 AM",
    startTime: "Mar 7, 2026 10:50 AM",
    active: false
  },
  {
    name: "Drip followup",
    category: "Nurture with time based workflow",
    createdBy: "Akansha Kondalwade",
    createdOn: "Feb 19, 2026 11:29 AM",
    startTime: "Feb 20, 2026 6:30 AM",
    active: false
  },
  {
    name: "Drip clod junk",
    category: "Nurture with time based workflow",
    createdBy: "Akansha Kondalwade",
    createdOn: "Feb 11, 2026 7:20 PM",
    startTime: "Feb 12, 2026 9:15 PM",
    active: false
  },
  {
    name: "Drip New",
    category: "Nurture with time based workflow",
    createdBy: "Akansha Kondalwade",
    createdOn: "Feb 11, 2026 7:17 PM",
    startTime: "Feb 12, 2026 8:30 PM",
    active: false
  }
];

const AutomationWorkflows = () => {
  const [rows, setRows] = useState(rowsData);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleToggle = (index) => {
    const updated = [...rows];
    updated[index].active = !updated[index].active;
    setRows(updated);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ p: 3, background: "#f6f6f6", minHeight: "100vh" }}>
      {/* Header */}
      <Box
        
        className="automation-header"
      >
        {/* <Typography variant="h5" fontWeight={600}>
          Automation Workflows
        </Typography> */}
        <div className="automation-tab-active">Automation Workflows</div>

        <Button
          variant="outlined"
          className="filter-btn"
          startIcon={<FilterAltOutlinedIcon />}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            color: colors.primary,
            borderColor: colors.primary,
            "&:hover": {
              backgroundColor: colors.primaryDark,
              borderColor: colors.primaryDark
            }
          }}
        >
          Filter
        </Button>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: "10px", overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: colors.primary , color: colors.white }}> 
              <TableCell><b>WORKFLOW NAME</b></TableCell>
              <TableCell><b>WORKFLOW CATEGORY</b></TableCell>
              <TableCell><b>CREATED BY</b></TableCell>
              <TableCell><b>CREATED ON</b></TableCell>
              <TableCell><b>START TIME</b></TableCell>
              <TableCell align="center"><b>ACTIVE</b></TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} hover>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.createdBy}</TableCell>
                <TableCell>{row.createdOn}</TableCell>
                <TableCell>{row.startTime}</TableCell>

                <TableCell align="center">
                  <Switch
                    checked={row.active}
                    onChange={() => handleToggle(index)}
                  />
                </TableCell>

                <TableCell align="right">
                  <IconButton onClick={handleMenuOpen}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem>Edit</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>

      {/* Floating Add Button */}
      <Fab
        color="warning"
        sx={{
          position: "fixed",
          bottom: 30,
          right: 30,
          backgroundColor: colors.primary,
          "&:hover": { backgroundColor: colors.primaryDark }
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default AutomationWorkflows;