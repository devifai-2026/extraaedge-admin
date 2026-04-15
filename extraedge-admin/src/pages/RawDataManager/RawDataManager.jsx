import React, { useState } from "react";
import { Tabs, Tab, Box, IconButton, Fab } from "@mui/material";
import './RawDataManager.css';

import FileUploadIcon from '@mui/icons-material/FileUpload';
import noLeadsImg from '../../assets/no-leads.svg';
import UploadLeads from '../../components/UploadLeads/UploadLeads';
import { colors } from '../../theme/colors';
import FiltersOptions from "../../components/FiltersOptions/FiltersOptions";

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
                            className={`custom-tab-button ${value === index ? "active" : ""}`}
                            sx={{
                                textTransform: "none",
                                minHeight: "36px",
                                fontSize: "13px",
                                borderRadius: "4px",
                                marginRight: "6px",
                                padding: "6px 12px",
                                backgroundColor: value === index ? colors.primary : "transparent",
                                color: value === index ? colors.white : colors.textGrey,
                                "&:hover": {
                                    backgroundColor: value === index ? colors.primary : colors.borderGrey,
                                },
                            }}
                        />
                    ))}
                </Tabs>

                {/* Divider aligned perfectly */}
                <div className="raw-data-manager-divider"></div>




            </div>

            <FiltersOptions />

            

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
                        backgroundColor: colors.primary,
                        color: colors.white,
                        "&:hover": { backgroundColor: colors.primaryDark },
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