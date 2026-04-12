import React, { useState } from "react";
import { Tabs, Tab, Box, IconButton, Fab } from "@mui/material";
import './LeadList.css';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import LeadCardContainer from "../../components/LeadCard/LeadCard";
import AddNewLead from "../../components/AddNewLead/AddNewLead";
import UploadLeads from "../../components/UploadLeads/UploadLeads";
import './LeadList.css';



const tabData = [
    { label: "All", count: 1359 },
    { label: "New", count: 6 },
    { label: "Ringing / Not Reachable", count: 0 },
    { label: "Followup", count: 108 },
    { label: "Demo Scheduled", count: 1 },
    { label: "Engaged Leads", count: 27 },
    { label: "Prospect", count: 1 },
    { label: "Demo Attended", count: 1 },
    { label: "Scheduled Visit", count: 0 },
    { label: "Visited", count: 5 },
    { label: "Enrolled", count: 59 },
    { label: "Junk", count: 163 },
    { label: "Cold", count: 988 },
    { label: "Re-enquired", count: 1 },
];

const LeadList = () => {
    const [value, setValue] = useState(0);
    const [addLeadOpen, setAddLeadOpen] = useState(false);
    const [uploadLeadOpen, setUploadLeadOpen] = useState(false);
    return (
        <div className="lead-list-maincontainer">
            {/* TABS SECTION */}
            <div className="lead-list-tabs" style={{ padding: "0 12px" }}>

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
                <div className="lead-card-divider"></div>
                    

            </div>


            <div className="lead-list-bottomcontainer">
                <div
                    style={{
                        width: "100%",
                        height: "56px",
                        
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 2,
                    }}
                >
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
            <div className="lead-card-scroll-area">
                <LeadCardContainer />
            </div>

            {/* Floating Action Buttons */}
            <div className="fab-container">
                <Fab
                    size="medium"
                    onClick={() => setAddLeadOpen(true)}
                    sx={{
                        backgroundColor: "#ff7800",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#e66a00" },
                    }}
                >
                    <AddIcon />
                </Fab>
                <Fab
                    size="medium"
                    onClick={() => setUploadLeadOpen(true)}
                    sx={{
                        backgroundColor: "#ff7800",
                        color: "#fff",
                        "&:hover": { backgroundColor: "#e66a00" },
                    }}
                >
                    <FileUploadIcon />
                </Fab>
            </div>
            <AddNewLead
                open={addLeadOpen}
                onClose={() => setAddLeadOpen(false)}
            />
            <UploadLeads
                open={uploadLeadOpen}
                onClose={() => setUploadLeadOpen(false)}
            />
        </div>
    );
}

export default LeadList;

