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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import { colors } from "../../theme/colors";
import "./AutomationWorkflow.css";
import {
  Popover,
  FormControl,
  Select
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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
  const [anchorElFilter, setAnchorElFilter] = useState(null);
  const [confirmIndex, setConfirmIndex] = useState(null);

  const handleFilterClick = (event) => {
    setAnchorElFilter(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorElFilter(null);
  };

  const openFilter = Boolean(anchorElFilter);

  const handleToggleClick = (index) => {
    setConfirmIndex(index);
  };

  const handleConfirmClose = () => {
    setConfirmIndex(null);
  };

  const handleConfirmYes = () => {
    if (confirmIndex === null) return;
    const updated = [...rows];
    updated[confirmIndex].active = !updated[confirmIndex].active;
    setRows(updated);
    setConfirmIndex(null);
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
          onClick={handleFilterClick}
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
            <TableRow sx={{ background: colors.primary, color: colors.white }}>
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
                    onChange={() => handleToggleClick(index)}
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
      <Popover
        open={openFilter}
        anchorEl={anchorElFilter}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        <Box className="filter-popover">

          {/* Header */}
          <Box className="filter-header">
            <Box display="flex" alignItems="center" gap={1}>
              <FilterAltOutlinedIcon fontSize="small" />
              <Typography fontWeight={600}>Filter</Typography>
            </Box>

            <IconButton size="small" onClick={handleFilterClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body */}
          <Box className="filter-body">

            <Typography className="filter-label">Counselors</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Name</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Category</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

            <Typography className="filter-label">Workflow Status</Typography>
            <FormControl fullWidth size="small">
              <Select displayEmpty>
                <MenuItem value="">Select...</MenuItem>
              </Select>
            </FormControl>

          </Box>

          {/* Footer */}
          <Box className="filter-footer">
            <Button variant="outlined" className="reset-btn">
              Reset
            </Button>
            <Button variant="contained" className="apply-btn">
              Apply Filter
            </Button>
          </Box>

        </Box>
      </Popover>

      {/* Activate / Deactivate Confirmation */}
      <Dialog
        open={confirmIndex !== null}
        onClose={handleConfirmClose}
        PaperProps={{ sx: { borderRadius: "10px", width: 480 } }}
      >
        <DialogTitle
          sx={{
            background: "#fbe9da",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            py: 1.5
          }}
        >
          {confirmIndex !== null && rows[confirmIndex]?.active
            ? "Deactivate Segment"
            : "Activate Segment"}
          <IconButton size="small" onClick={handleConfirmClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1, mt: 1 }}>
            {confirmIndex !== null && rows[confirmIndex]?.active
              ? "Do you want to deactivate the rule?"
              : "Do you want to activate the rule?"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {confirmIndex !== null && rows[confirmIndex]?.active
              ? "Once the rule is inactive all the communication will stop."
              : "Once the rule is active all the communication will start going again"}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleConfirmClose}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              color: colors.primary,
              borderColor: colors.primary
            }}
          >
            No
          </Button>
          <Button
            onClick={handleConfirmYes}
            variant="contained"
            sx={{
              textTransform: "none",
              borderRadius: "6px",
              backgroundColor: colors.primary,
              "&:hover": { backgroundColor: colors.primaryDark }
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationWorkflows;