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
    FormControl
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

    const handleToggle = (index) => {
        const updated = [...rows];
        updated[index].active = !updated[index].active;
        setRows(updated);
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
            {/* <div className="drip-header">
                <h2>Drip Marketing Campaign Rules</h2>

                
            </div> */}

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
                                    <IconButton size="small">
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

            
        </div>
    );
};

export default DripCampaignRules;