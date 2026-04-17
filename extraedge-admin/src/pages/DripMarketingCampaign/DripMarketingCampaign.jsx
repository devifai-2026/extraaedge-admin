import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    IconButton,
    Button,
    Fab,
    Popover,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Menu,
    Dialog,
    DialogContent,
    DialogActions
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import "./DripMarketingCampaign.css";
import { colors } from "../../theme/colors";

const data = [
    {
        description: "Followup Msg",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 5:23 PM",
        startTime: "Aug 11, 2025 8:07 PM",
        active: false
    },
    {
        description: "Demo Attended",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 5:15 PM",
        startTime: "Aug 11, 2025 6:07 PM",
        active: false
    },
    {
        description: "Demo After visit+Followup Msg",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 5:11 PM",
        startTime: "Aug 11, 2025 6:07 PM",
        active: false
    },
    {
        description: "will visit",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 4:22 PM",
        startTime: "Aug 11, 2025 5:07 PM",
        active: false
    },
    {
        description: "visited",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 4:30 PM",
        startTime: "Aug 11, 2025 5:07 PM",
        active: false
    },
    {
        description: "Untouched",
        createdBy: "Abhijeet Salgar",
        createdOn: "Aug 11, 2025 4:12 PM",
        startTime: "Aug 12, 2025 10:07 AM",
        active: false
    }
];

const DripCampaignRules = () => {
    const [rows, setRows] = React.useState(data);
    const [filterAnchorEl, setFilterAnchorEl] = React.useState(null);
    const [selectedCounselor, setSelectedCounselor] = React.useState("");
    const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
    const [activeRowIndex, setActiveRowIndex] = React.useState(null);
    const [openStopModal, setOpenStopModal] = React.useState(false);
    const [openToggleModal, setOpenToggleModal] = React.useState(false);
    const [toggleRowIndex, setToggleRowIndex] = React.useState(null);

    const handleMenuOpen = (event, index) => {
        setMenuAnchorEl(event.currentTarget);
        setActiveRowIndex(index);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleEdit = () => {
        handleMenuClose();
    };

    const handleDeleteClick = () => {
        setOpenStopModal(true);
        setMenuAnchorEl(null);
    };

    const handleConfirmDelete = () => {
        if (activeRowIndex !== null) {
            const updated = rows.filter((_, i) => i !== activeRowIndex);
            setRows(updated);
        }
        setOpenStopModal(false);
        setActiveRowIndex(null);
    };

    const handleToggle = (index) => {
        setToggleRowIndex(index);
        setOpenToggleModal(true);
    };

    const handleConfirmToggle = () => {
        if (toggleRowIndex !== null) {
            const updated = [...rows];
            updated[toggleRowIndex].active = !updated[toggleRowIndex].active;
            setRows(updated);
        }
        setOpenToggleModal(false);
        setToggleRowIndex(null);
    };

    const handleCancelToggle = () => {
        setOpenToggleModal(false);
        setToggleRowIndex(null);
    };

    const handleFilterOpen = (event) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleClearFilter = () => {
        setSelectedCounselor("");
    };

    const handleApplyFilter = () => {
        handleFilterClose();
    };

    const isFilterOpen = Boolean(filterAnchorEl);



    return (
        <div className="drip-container">
            {/* Header */}
            <div className="drip-header">
                
                <div className="drip-tab-active">Drip Marketing Campaign Rules</div>
                <Button
                    variant="outlined"
                    startIcon={<FilterAltIcon />}
                    className="filter-btn"
                    onClick={handleFilterOpen}
                >
                    Filter
                </Button>

                <Popover
                    open={isFilterOpen}
                    anchorEl={filterAnchorEl}
                    onClose={handleFilterClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    slotProps={{ paper: { className: "counselor-filter-popover" } }}
                >
                    <div className="counselor-filter-header">
                        <Typography className="counselor-filter-title">Counselors</Typography>
                        <IconButton size="small" onClick={handleFilterClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>

                    <FormControl fullWidth size="small" className="counselor-filter-select">
                        <Select
                            displayEmpty
                            value={selectedCounselor}
                            onChange={(e) => setSelectedCounselor(e.target.value)}
                            renderValue={(selected) =>
                                selected ? selected : <span className="counselor-placeholder">Select...</span>
                            }
                        >
                            <MenuItem value="Abhijeet Salgar">Abhijeet Salgar</MenuItem>
                            <MenuItem value="Priya Sharma">Priya Sharma</MenuItem>
                            <MenuItem value="Rahul Verma">Rahul Verma</MenuItem>
                        </Select>
                    </FormControl>

                    <div className="counselor-filter-actions">
                        <Button
                            variant="outlined"
                            className="clear-filter-btn"
                            onClick={handleClearFilter}
                        >
                            Clear Filter
                        </Button>
                        <Button
                            variant="contained"
                            className="apply-filter-btn"
                            onClick={handleApplyFilter}
                        >
                            Apply
                        </Button>
                    </div>
                </Popover>
            </div>

            {/* Table */}
            <TableContainer component={Paper} className="table-container">
                <Table>
                    <TableHead>
                        <TableRow className="table-head">
                            <TableCell>DESCRIPTION</TableCell>
                            <TableCell>CREATED BY</TableCell>
                            <TableCell>CREATED ON</TableCell>
                            <TableCell>START TIME</TableCell>
                            <TableCell>ACTIVE</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} className="table-row">
                                <TableCell>{row.description}</TableCell>
                                <TableCell>{row.createdBy}</TableCell>
                                <TableCell>{row.createdOn}</TableCell>
                                <TableCell>{row.startTime}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={row.active}
                                        onChange={() => handleToggle(index)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleMenuOpen(e, index)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Floating Button */}
            <Fab className="fab-btn">
                <AddIcon sx={{ color: colors.white }}/>
            </Fab>

            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MenuItem onClick={handleEdit}>Edit</MenuItem>
                <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
            </Menu>

            <Dialog
                open={openStopModal}
                onClose={() => setOpenStopModal(false)}
                maxWidth="md"
                fullWidth
            >
                <div
                    style={{
                        background: colors.primary,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: colors.white
                    }}
                >
                    <span style={{ fontWeight: 600 }}>Stop Campaign</span>
                    <IconButton size="small" onClick={() => setOpenStopModal(false)}>
                        <CloseIcon sx={{ color: colors.white }} />
                    </IconButton>
                </div>

                <DialogContent style={{ padding: "24px" }}>
                    <p style={{ fontSize: "25px", color: colors.textDark }}>
                        Do you want to stop the Campaign?
                    </p>
                </DialogContent>

                <DialogActions style={{ padding: "16px 24px" }}>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenStopModal(false)}
                        sx={{ textTransform: "none" }}
                    >
                        No
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmDelete}
                        sx={{
                            textTransform: "none",
                            backgroundColor: colors.primary,
                            "&:hover": { backgroundColor: colors.primaryDark }
                        }}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openToggleModal}
                onClose={handleCancelToggle}
                maxWidth="sm"
                fullWidth
            >
                <div
                    style={{
                        background: colors.primary,
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: colors.white
                    }}
                >
                    <span style={{ fontWeight: 600 }}>
                        {toggleRowIndex !== null && rows[toggleRowIndex]?.active
                            ? "Deactivate Segment"
                            : "Activate Segment"}
                    </span>
                    <IconButton size="small" onClick={handleCancelToggle}>
                        <CloseIcon sx={{ color: colors.white }} />
                    </IconButton>
                </div>

                <DialogContent style={{ padding: "24px" }}>
                    <p style={{ fontSize: "20px", color: colors.textDark, margin: 0 }}>
                        {toggleRowIndex !== null && rows[toggleRowIndex]?.active
                            ? "Do you want to deactivate the rule?"
                            : "Do you want to activate the rule?"}
                    </p>
                    <p style={{ fontSize: "14px", color: colors.textDark, marginTop: "8px" }}>
                        {toggleRowIndex !== null && rows[toggleRowIndex]?.active
                            ? "Once the rule is inactive all the communication will stop"
                            : "Once the rule is active all the communication will start going again"}
                    </p>
                </DialogContent>

                <DialogActions style={{ padding: "16px 24px" }}>
                    <Button
                        variant="outlined"
                        onClick={handleCancelToggle}
                        sx={{ textTransform: "none" }}
                    >
                        No
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmToggle}
                        sx={{
                            textTransform: "none",
                            backgroundColor: colors.primary,
                            "&:hover": { backgroundColor: colors.primaryDark }
                        }}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default DripCampaignRules;