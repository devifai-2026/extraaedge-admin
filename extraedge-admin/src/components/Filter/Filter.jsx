import React, { useState } from "react";
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Button,
    TextField,
    InputBase,
    Checkbox,
    FormControlLabel
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { colors } from "../../theme/colors";


/* ================= COMMON INPUT STYLE ================= */
const inputStyle = {
    "& .MuiInputBase-root": {
        background: "#f1f3f5",
        borderRadius: "6px"
    }
};


/* ================= ACCORDION SECTION ================= */
const Section = ({ title }) => {
    const [open, setOpen] = useState(false);

    return (
        <Box sx={{ borderBottom: "1px solid #eee", mb: 1 }}>
            <Box
                onClick={() => setOpen(!open)}
                sx={{ display: "flex", alignItems: "center", cursor: "pointer", py: 1 }}
            >
                {open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                <Typography fontSize={14}>{title}</Typography>
            </Box>

            {open && (
                <Box sx={{ border: "1px dashed #ddd", borderRadius: "6px", p: 2 }}>
                    <FormControlLabel
                        control={<Checkbox size="small" />}
                        label="Show with duplicate leads"
                    />

                    <Typography fontSize={13}>{title} Category</Typography>

                    <TextField
                        fullWidth
                        size="small"
                        placeholder={`Select ${title} Category`}
                        sx={inputStyle}
                    />
                </Box>
            )}
        </Box>
    );
};


/* ================= MAIN ================= */
const FilterLeadsModal = ({ open, onClose }) => {

    const [activeSection, setActiveSection] = useState("Lead Details");

    const sections = [
        "Lead Details",
        "Personal Details",
        "Communication Details",
        "Verification Details",
        "Date Filters",
        "Range Filters"
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>

            {/* HEADER */}
            <Box
                className="FilterLeadsModal-Header"
                sx={{
                    backgroundColor: "var(--primary)", 
                    color: "var(--white)",
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    justifyContent: "space-between"
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FilterAltIcon />
                    <Typography fontWeight={600}>Filter Leads</Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 2 }}>
                    <InputBase
                        placeholder="Select And Load Saved Filters"
                        sx={{
                            background: colors.lightError,
                            px: 2,
                            borderRadius: "6px",
                            width: 260
                        }}
                    />
                    <IconButton onClick={onClose}><CloseIcon /></IconButton>
                </Box>
            </Box>

            {/* CHIP */}
            <Box sx={{ px: 2, py: 1 }}>
                <Box sx={{ background: "#eee", px: 1.5, py: 0.5, borderRadius: 1 }}>
                    Lead Details (1) ✕
                </Box>
            </Box>

            {/* BODY */}
            <Box sx={{ display: "flex", height: "65vh" }}>

                {/* LEFT */}
                <Box sx={{ width: 240, borderRight: "1px solid #eee", p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <SearchIcon fontSize="small" />
                        <InputBase placeholder="Search Section" />
                    </Box>

                    {sections.map((item) => (
                        <Box
                            key={item}
                            onClick={() => setActiveSection(item)}
                            sx={{
                                display: "flex",
                                gap: 1,
                                p: 1,
                                cursor: "pointer",
                                background: activeSection === item ? "var(--primary);" : ""
                            }}
                        >
                            <input type="checkbox" />
                            <Typography fontSize={14}>{item}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* RIGHT */}
                <Box sx={{ flex: 1, p: 3, overflowY: "auto" }}>

                    {/* SEARCH */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <SearchIcon fontSize="small" />
                        <InputBase placeholder="Search Filter Fields" />
                    </Box>

                    {/* ================= LEAD DETAILS ================= */}
                    {activeSection === "Lead Details" && (
                        <>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField fullWidth size="small" placeholder="Is Touched" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Untouched Leads" sx={inputStyle} />
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <TextField fullWidth size="small" placeholder="All Counselors" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Stage" sx={inputStyle} />
                            </Box>

                            <TextField fullWidth size="small" placeholder="Sub-Stage" sx={inputStyle} />

                            <Section title="Campaign" />
                            <Section title="Channel" />
                            <Section title="Source" />
                            <Section title="Medium" />

                            <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField fullWidth size="small" placeholder="Program" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Referred From" sx={inputStyle} />
                            </Box>
                        </>
                    )}

                    {/* ================= PERSONAL DETAILS ================= */}
                    {activeSection === "Personal Details" && (
                        <>
                            <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField fullWidth size="small" placeholder="Applicant Name" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Email Id" sx={inputStyle} />
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                <TextField fullWidth size="small" placeholder="WhatsApp Number" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="State" sx={inputStyle} />
                            </Box>
                            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                <TextField fullWidth size="small" placeholder="City" sx={inputStyle} />
                            </Box>

                        </>
                    )}

                    {/* ================= COMMUNICATION ================= */}
                    {activeSection === "Communication Details" && (
                        <>
                            {[
                                "Primary Email", "Primary Mobile",
                                "Alternate Email", "Alternate Mobile",
                                "Father Email", "Father Mobile",
                                "Mother Email", "Mother Mobile"
                            ].map((item, i) => (
                                <Box key={i} sx={{ display: "flex", gap: 2, mb: 2 }}>
                                    <TextField fullWidth size="small" placeholder={`Is ${item} Present?`} sx={inputStyle} />
                                    <TextField fullWidth size="small" placeholder={`Is ${item} Present?`} sx={inputStyle} />
                                </Box>
                            ))}

                            <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField fullWidth size="small" placeholder="Select Communication Type" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Select Response" sx={inputStyle} />
                            </Box>
                        </>
                    )}

                    {/* ================= VERIFICATION ================= */}
                    {activeSection === "Verification Details" && (
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <TextField fullWidth size="small" placeholder="Verification Stage" sx={inputStyle} />
                            <TextField fullWidth size="small" placeholder="Verification Done Via" sx={inputStyle} />
                        </Box>
                    )}

                    {/* ================= DATE FILTER ================= */}
                    {activeSection === "Date Filters" && (
                        <>
                            {[
                                "Added On", "Updated On",
                                "ReferredTo Update Date",
                                "Automated Update Date",
                                "Followup Scheduled On",
                                "Re-Enquired"
                            ].map((item, i) => (
                                <Box key={i} sx={{ display: "flex", gap: 2, mb: 2 }}>
                                    <TextField fullWidth size="small" placeholder={`From ${item}`} sx={inputStyle} />
                                    <TextField fullWidth size="small" placeholder={`To ${item}`} sx={inputStyle} />
                                </Box>
                            ))}
                        </>
                    )}

                    {/* ================= RANGE FILTER ================= */}
                    {activeSection === "Range Filters" && (
                        <>
                            <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField fullWidth size="small" placeholder="Lead Age From" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Lead Age To" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="From Number" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="To Number" sx={inputStyle} />
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                                <TextField fullWidth size="small" placeholder="Lead Score From" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Lead Score To" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Re-Enquired From Date" sx={inputStyle} />
                                <TextField fullWidth size="small" placeholder="Re-Enquired To" sx={inputStyle} />
                            </Box>
                        </>
                    )}

                </Box>
            </Box>

            {/* FOOTER */}
            <Box sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                p: 2,
                borderTop: "1px solid #eee"
            }}>
                <Button variant="outlined">Reset</Button>
                <Button variant="contained" sx={{ background:colors.primary }}>
                    Apply Filter
                </Button>
            </Box>

        </Dialog>
    );
};

export default FilterLeadsModal;