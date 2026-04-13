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
import { colors } from "../../theme/colors";
import './LeadList.css';
import TabsSection from "../../components/TabsSection/TabsSection";





const LeadList = () => {
    
    const [addLeadOpen, setAddLeadOpen] = useState(false);
    const [uploadLeadOpen, setUploadLeadOpen] = useState(false);
    return (
        <div className="lead-list-maincontainer">
            
            <TabsSection />

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
                        <SwapVertIcon sx={{ color: colors.primary }} />
                    </IconButton>

                    {/* Right Icons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton size="small">
                            <GroupIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small">
                            <WhatsAppIcon sx={{ color: colors.primary }} />
                        </IconButton>

                        <IconButton size="small">
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
            <div className="lead-card-scroll-area">
                <LeadCardContainer />
            </div>

            {/* Floating Action Buttons */}
            <div className="fab-container">
                <Fab
                    size="medium"
                    onClick={() => setAddLeadOpen(true)}
                    sx={{
                        backgroundColor: colors.primary,
                        color: colors.white,
                        "&:hover": { backgroundColor: colors.primaryDark },
                    }}
                >
                    <AddIcon />
                </Fab>
                <Fab
                    size="medium"
                    onClick={() => setUploadLeadOpen(true)}
                    sx={{
                        backgroundColor: colors.primary,
                        color: colors.white,
                        "&:hover": { backgroundColor: colors.primaryDark },
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

