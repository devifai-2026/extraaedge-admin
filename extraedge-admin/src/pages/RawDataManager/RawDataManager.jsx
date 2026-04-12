import React, { useState } from "react";
import { Tabs, Tab, Box, IconButton, Fab } from "@mui/material";
import './RawDataManager.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import noLeadsImg from '../../assets/no-leads.svg';
import UploadLeads from '../../components/UploadLeads/UploadLeads';

const tabData = [
    { label: "All", count: 13 },
    { label: "Cold", count: 6 },
    { label: "Mobile Verified", count: 4 },
    { label: "Email Verified", count: 1 },
    { label: "Both Verified", count: 1 },
    { label: "Warm", count: 1 },

];

function RawDataManager() {
    const [value, setValue] = useState(0);
    const [uploadOpen, setUploadOpen] = useState(false);
    return (
        <div className="raw-data-manager-maincontainer">
            <div className="raw-data-manager-tabs" >

                <Tabs
                    value={value}
                    onChange={(e, newValue) => setValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    TabIndicatorProps={{ style: { display: "none" } }}
                >
                    {tabData.map((tab, index) => (
                        <Tab
                            key={index}
                            label={`${tab.label} (${tab.count})`}
                            sx={{
                                textTransform: "none",
                                minHeight: "36px",
                                fontSize: "13px",
                                borderRadius: "4px",
                                marginRight: "6px",
                                padding: "6px 12px",
                                backgroundColor: value === index ? "#ff7800" : "transparent",
                                color: value === index ? "#fff" : "#7d7d7d",
                                "&:hover": {
                                    backgroundColor: value === index ? "#ff7800" : "#e0e0e0",
                                },
                            }}
                        />
                    ))}
                </Tabs>

                {/* Divider aligned perfectly */}
                <div className="raw-data-manager-divider"></div>




            </div>

            <div className="raw-data-manager-bottomcontainer">
                <div className="raw-data-manager-bottomcontainer-content">
                    {/* Left Icon */}
                    <IconButton size="small">
                        <SwapVertIcon sx={{ color: "#ff6d00" }} />
                    </IconButton>

                    {/* Right Icons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton size="small">
                            <GroupIcon sx={{ color: "#ff6d00" }} />
                        </IconButton>

                        <IconButton size="small">
                            <WhatsAppIcon sx={{ color: "#ff6d00" }} />
                        </IconButton>

                        <IconButton size="small">
                            <RefreshIcon sx={{ color: "#ff6d00" }} />
                        </IconButton>

                        <IconButton size="small">
                            <ViewListIcon sx={{ color: "#ff6d00" }} />
                        </IconButton>

                        <IconButton size="small">
                            <FilterAltIcon sx={{ color: "#ff6d00" }} />
                        </IconButton>
                    </Box>
                </div>
            </div>

            {/* Empty State */}
            <div className="raw-data-manager-empty-state">
                <img src={noLeadsImg} alt="No leads found" width={180} />
                <h3 className="raw-data-manager-empty-title">No leads found</h3>
                <p className="raw-data-manager-empty-subtitle">
                    It looks like there are no leads in the list yet
                </p>
            </div>

            {/* Upload FAB */}
            <div className="raw-data-manager-fab">
                <Fab
                    size="medium"
                    onClick={() => setUploadOpen(true)}
                    sx={{
                        backgroundColor: "#ff7800",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#e66a00" },
                    }}
                >
                    <FileUploadIcon />
                </Fab>
            </div>

            <UploadLeads open={uploadOpen} onClose={() => setUploadOpen(false)} />
        </div>
    );
}

export default RawDataManager;