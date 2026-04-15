import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import './FiltersOptions.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Drawer } from "@mui/material";
import WhatsappModal from "../WhatsApp/WhatsApp"

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
import FilterLeadsModal from "../Filter/Filter";

const FiltersOptions = () => {
    const [openAssign, setOpenAssign] = useState(false);
    const [openWhatsapp, setOpenWhatsapp] = useState(false);
    const [openSort, setOpenSort] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [openListDrawer, setOpenListDrawer] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);

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

                        <IconButton size="small" onClick={() => setOpenListDrawer(true)}>
                            <ViewListIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small" onClick={() => setOpenFilter(true)}>
                            <FilterAltIcon sx={{ color: colors.primary }} />
                        </IconButton>
                    </Box>
                </div>
            </div>

            {/* ================= ASSIGN MODAL ================= */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
                <DialogTitle className='assignmodel-filter' >
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
                    <Button variant="contained" className='assign-btn-filter' >
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================= WHATSAPP MODAL ================= */}
            <WhatsappModal
                open={openWhatsapp}
                onClose={() => setOpenWhatsapp(false)}
            />


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

            {/* ================= LIST DRAWER ================= */}

            <Drawer
                anchor="right"
                open={openListDrawer}
                onClose={() => setOpenListDrawer(false)}
            >
                <Box
                    sx={{
                        width: 320,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* HEADER */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: "1px solid #ddd",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontWeight: 600
                        }}
                    >
                        Saved List
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => setOpenListDrawer(false)}
                        >
                            ✕
                        </span>
                    </Box>

                    {/* CONTENT */}
                    <Box sx={{ p: 2, flex: 1 }}>
                        <Typography fontSize={13} mb={1}>
                            Select Saved List
                        </Typography>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Select Option"
                        />
                    </Box>

                    {/* FOOTER */}
                    <Box
                        sx={{
                            p: 2,
                            borderTop: "1px solid #ddd",
                            display: "flex",
                            justifyContent: "space-between"
                        }}
                    >
                        <Button variant="outlined">Reset</Button>
                        <Button variant="contained" sx={{ background: "#f36f21" }}>
                            Load List
                        </Button>
                    </Box>
                </Box>
            </Drawer>
            <FilterLeadsModal
                open={openFilter}
                onClose={() => setOpenFilter(false)}
            />
        </>
    );
};

export default FiltersOptions;