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
    Fab
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AddIcon from "@mui/icons-material/Add";
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

    const handleToggle = (index) => {
        const updated = [...rows];
        updated[index].active = !updated[index].active;
        setRows(updated);
    };

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
                >
                    Filter
                </Button>
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