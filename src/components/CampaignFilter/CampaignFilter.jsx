import React from "react";
import {
    Drawer,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Chip,
    Autocomplete,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import { colors } from "../../theme/colors";

const counselorOptions = ["Abhijeet Salgar"];
const campaignOptions = [];

const CampaignFilter = ({ open, onClose }) => {
    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box
                sx={{
                    width: 340,
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
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <GroupIcon sx={{ color: colors.primary }} />
                        <Typography fontWeight={600}>Campaign Filter</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* CONTENT */}
                <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box>
                        <Typography fontSize={13} mb={1}>
                            Select Counselors
                        </Typography>
                        <Autocomplete
                            multiple
                            size="small"
                            options={counselorOptions}
                            defaultValue={["Abhijeet Salgar"]}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        size="small"
                                        label={option}
                                        {...getTagProps({ index })}
                                        key={option}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Counselor" />
                            )}
                        />
                    </Box>

                    <Box>
                        <Typography fontSize={13} mb={1}>
                            Campaign
                        </Typography>
                        <Autocomplete
                            size="small"
                            options={campaignOptions}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Campaign Name" />
                            )}
                        />
                    </Box>
                </Box>

                {/* FOOTER */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: "1px solid #ddd",
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <Button variant="outlined" onClick={onClose}>
                        Reset
                    </Button>
                    <Button
                        variant="contained"
                        sx={{ background: colors.primary, "&:hover": { background: colors.primary } }}
                    >
                        Filter
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
};

export default CampaignFilter;
