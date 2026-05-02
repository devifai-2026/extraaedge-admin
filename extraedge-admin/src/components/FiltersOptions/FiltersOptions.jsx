import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import './FiltersOptions.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CampaignIcon from "@mui/icons-material/Campaign";
import EditIcon from "@mui/icons-material/Edit";
import CallIcon from "@mui/icons-material/Call";
import ChatIcon from "@mui/icons-material/Chat";
import EmailIcon from "@mui/icons-material/Email";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import WhatsappModal from "../WhatsApp/WhatsApp"
import SavedList from "../SavedList/SavedList";
import BulkMarketingCampaignDrawer from "../BulkMarketingCampaignDrawer/BulkMarketingCampaignDrawer";

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
    const [openCampaignConfirm, setOpenCampaignConfirm] = useState(false);
    const [openCampaignDrawer, setOpenCampaignDrawer] = useState(false);

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

                        {/* CAMPAIGN */}
                        <IconButton size="small" onClick={() => setOpenCampaignConfirm(true)}>
                            <CampaignIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* EDIT */}
                        <IconButton size="small">
                            <EditIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* GROUP MODAL */}
                        <IconButton size="small" onClick={() => setOpenAssign(true)}>
                            <GroupIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* CALL */}
                        <IconButton size="small">
                            <CallIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* CHAT */}
                        <IconButton size="small">
                            <ChatIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* EMAIL */}
                        <IconButton size="small">
                            <EmailIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* WHATSAPP MODAL */}
                        <IconButton size="small" onClick={() => setOpenWhatsapp(true)}>
                            <WhatsAppIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small" onClick={handleRefresh}>
                            <RefreshIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        {/* DOWNLOAD */}
                        <IconButton size="small">
                            <FileDownloadIcon sx={{ color: colors.primary }} />
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

            {/* ================= SAVED LIST DRAWER ================= */}
            <SavedList
                open={openListDrawer}
                onClose={() => setOpenListDrawer(false)}
            />
            <FilterLeadsModal
                open={openFilter}
                onClose={() => setOpenFilter(false)}
            />

            {/* ================= CAMPAIGN CONFIRM MODAL ================= */}
            <Dialog
                open={openCampaignConfirm}
                onClose={() => setOpenCampaignConfirm(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle className='assignmodel-filter'>
                    Add Campaign
                </DialogTitle>

                <DialogContent>
                    <Typography fontWeight={600}>
                        Do you want to add bulk communication marketing campaign?
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenCampaignConfirm(false)}>No</Button>
                    <Button
                        variant="contained"
                        className='assign-btn-filter'
                        onClick={() => {
                            setOpenCampaignConfirm(false);
                            setOpenCampaignDrawer(true);
                        }}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================= BULK MARKETING CAMPAIGN DRAWER ================= */}
            <BulkMarketingCampaignDrawer
                open={openCampaignDrawer}
                onClose={() => setOpenCampaignDrawer(false)}
                leadsCount={28625}
            />
        </>
    );
};

export default FiltersOptions;