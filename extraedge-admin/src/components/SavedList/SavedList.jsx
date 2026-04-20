import React from "react";
import { Drawer, Box, Typography, TextField, Button } from "@mui/material";
import { colors } from '../../theme/colors'

const SavedList = ({ open, onClose }) => {
    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
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
                        onClick={onClose}
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
                    <Button variant="outlined" onClick={onClose}>Reset</Button>
                    <Button variant="contained" sx={{ background: colors.primary }}>
                        Load List
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
};

export default SavedList;
