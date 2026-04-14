import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import './FiltersOptions.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import {
    Box,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Divider,
    Checkbox,
    FormControlLabel,
    Radio,
    TextField
} from "@mui/material";
import { Popover, MenuItem, ListItemIcon, ListItemText, } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Menu } from "@mui/material";

const FiltersOptions = () => {
    const [openAssign, setOpenAssign] = useState(false);
    const [openWhatsapp, setOpenWhatsapp] = useState(false);
    const [openSort, setOpenSort] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <>
            <div className="raw-data-manager-bottomcontainer">
                <div className="raw-data-manager-bottomcontainer-content">

                    <IconButton
                        size="small"
                        onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setOpenSort(true);
                        }}
                    >
                        <SwapVertIcon sx={{ color: colors.primary, cursor: "pointer" }} />
                    </IconButton>

                    <Box sx={{ display: "flex", gap: 1 }}>

                        {/* GROUP MODAL */}
                        <IconButton size="small" onClick={() => setOpenAssign(true)}>
                            <GroupIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* WHATSAPP MODAL */}
                        <IconButton size="small" onClick={() => setOpenWhatsapp(true)}>
                            <WhatsAppIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small" onClick={handleRefresh}>
                            <RefreshIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small">
                            <ViewListIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small">
                            <FilterAltIcon sx={{ color: colors.primary }} />
                        </IconButton>
                    </Box>
                </div>
            </div>

            {/* ================= ASSIGN MODAL ================= */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ background: "#e6d6cc", fontWeight: 600 }}>
                    Refer Leads/Applications
                </DialogTitle>

                <DialogContent>
                    <Typography fontWeight={600}>
                        Do you want to assign 1360 Leads?
                    </Typography>
                    <Typography color="gray" fontSize={14}>
                        Are you sure you want to proceed with referring all selected leads?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
                    <Button variant="contained" sx={{ background: "#f36f21" }}>
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================= WHATSAPP MODAL ================= */}
            <Dialog
                open={openWhatsapp}
                onClose={() => setOpenWhatsapp(false)}
                maxWidth="md"
                fullWidth
            >
                {/* HEADER */}
                <DialogTitle
                    sx={{
                        background: "#d6c8bd",
                        fontWeight: 600,
                        fontSize: "18px"
                    }}
                >
                    WhatsApp Chat
                </DialogTitle>

                {/* CONTENT */}
                <DialogContent
                    dividers
                    sx={{
                        maxHeight: "520px",
                        overflowY: "auto",
                        px: 3
                    }}
                >

                    {/* COUNT STAGE */}
                    <Typography fontWeight={600} mb={1}>
                        Count Stage
                    </Typography>

                    <TableContainer
                        sx={{
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            mb: 2
                        }}
                    >
                        <Table size="small">
                            <TableHead sx={{ background: "#f3e8e2" }}>
                                <TableRow>
                                    <TableCell></TableCell>
                                    <TableCell align="center">Used</TableCell>
                                    <TableCell align="center">Available</TableCell>
                                    <TableCell align="center">Total</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {[
                                    ["Monthly Business Initiated Messages", 0, 3000, 3000],
                                    ["Daily Business Initiated Messages", 0, 100, 100],
                                    ["Monthly Session Messages", 0, 6000, 6000],
                                    ["Daily Session Messages", 0, 200, 200],
                                ].map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{row[0]}</TableCell>
                                        <TableCell align="center">{row[1]}</TableCell>
                                        <TableCell align="center">{row[2]}</TableCell>
                                        <TableCell align="center">{row[3]}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* CHECKBOX */}
                    <Typography fontWeight={600}>
                        Select the WhatsApp No to send
                    </Typography>

                    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 2 }}>
                        <FormControlLabel control={<Checkbox />} label="WhatsApp Number" />
                        <FormControlLabel control={<Checkbox />} label="Father's Number" />
                        <FormControlLabel control={<Checkbox />} label="Mother's Number" />
                        <FormControlLabel control={<Checkbox />} label="WhatsApp No" />
                    </Box>

                    {/* RADIO */}
                    <Typography fontWeight={600}>
                        Select a user to receive students response
                    </Typography>

                    <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                        <FormControlLabel control={<Radio defaultChecked />} label="Sender" />
                        <FormControlLabel control={<Radio />} label="Current Lead Owner" />
                    </Box>

                    {/* TEMPLATE */}
                    <Typography>Select WhatsApp Template</Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Select WhatsApp Template"
                        sx={{ mb: 2 }}
                    />

                    {/* RETRY */}
                    <Typography>
                        WhatsApp Retry Attempts <span style={{ color: "red" }}>*</span>
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Enter number of retry attempts"
                        sx={{ mb: 2 }}
                    />

                    {/* MESSAGE */}
                    <Typography>Message</Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Message"
                        sx={{ mb: 2 }}
                    />

                    {/* BOTTOM TEXT */}
                    <Typography fontWeight={500}>
                        Do you want to send WhatsApp Message to 1338 Leads?
                    </Typography>

                </DialogContent>

                {/* FOOTER */}
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        justifyContent: "flex-end",
                        gap: 2
                    }}
                >
                    <Button
                        onClick={() => setOpenWhatsapp(false)}
                        sx={{ color: "#1976d2" }}
                    >
                        CANCEL
                    </Button>

                    <Button
                        variant="contained"
                        sx={{
                            background: "#f4a57a",
                            "&:hover": { background: "#e89063" }
                        }}
                    >
                        SEND WHATSAPP
                    </Button>
                </DialogActions>
            </Dialog>


            {/* ================= SORT POPOVER ================= */}

            <Menu
                open={openSort}
                anchorEl={anchorEl}
                onClose={() => setOpenSort(false)}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                }}
            >
                <div className="sort-modal">
                    <p className="sort-title">No sorting applied to this list.</p>

                    <div className="sort-header">
                        Select a field to sort by ▲
                    </div>

                    <div className="sort-list">
                        {[
                            "Added On",
                            "Engagement Score",
                            "Last Updated On",
                            "Followup Scheduled On",
                            "Re-enquiry Date",
                            "Lead Score",
                            "Automated Update Date",
                            "Referred To Update Date",
                        ].map((item, index) => (
                            <MenuItem key={index} className="sort-item">
                                <ListItemIcon>
                                    <CalendarTodayIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={item} />
                            </MenuItem>
                        ))}
                    </div>
                </div>
            </Menu>
        </>
    );
};

export default FiltersOptions;