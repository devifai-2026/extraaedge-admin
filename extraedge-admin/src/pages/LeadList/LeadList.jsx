import React, { useState } from "react";
import { Fab } from "@mui/material";
import './LeadList.css';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import LeadCardContainer from "../../components/LeadCard/LeadCard";
import AddNewLead from "../../components/AddNewLead/AddNewLead";
import UploadLeads from "../../components/UploadLeads/UploadLeads";
import { colors } from "../../theme/colors";
import './LeadList.css';
import TabsSection from "../../components/TabsSection/TabsSection";
import FiltersOptions from "../../components/FiltersOptions/FiltersOptions";





const LeadList = () => {
    
    const [addLeadOpen, setAddLeadOpen] = useState(false);
    const [uploadLeadOpen, setUploadLeadOpen] = useState(false);
    return (
        <div className="lead-list-maincontainer">
            
            <TabsSection />
            <FiltersOptions />

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

