import React from 'react';
import { colors } from '../../theme/colors';
import SwapVertIcon from "@mui/icons-material/SwapVert";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {  Box, IconButton} from "@mui/material";

const FiltersOptions = () => {
    return (
        <>
            <div className="raw-data-manager-bottomcontainer">
                <div className="raw-data-manager-bottomcontainer-content">
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
        </>
    );
}

export default FiltersOptions;
