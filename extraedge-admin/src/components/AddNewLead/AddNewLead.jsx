import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./AddNewLead.css";

const programOptions = [
    "Data Analyst Training And Certification",
    "Advanced Python Development",
    "Full Stack Web Development",
    "Data Science with ML",
    "UI/UX Design Bootcamp",
];

const genderOptions = ["Male", "Female", "Other"];

const graduationYears = Array.from({ length: 20 }, (_, i) => 2015 + i);

const stageOptions = [
    "01-New",
    "02-Contacted",
    "03-Followup",
    "05-Qualified",
    "07-Requirement Match",
    "08-Interested",
    "09-Visited",
    "10-Enrolled",
];

const subStageOptions = [
    "Not Called",
    "Awaiting confirmation",
    "Will join soon",
    "Negotiation phase",
    "Needs demo",
];

const channelOptions = ["Offline", "Online", "Direct", "Facebook", "Google Ads", "LinkedIn", "Email Campaign"];

const sourceOptions = ["Direct Walkin", "Website", "Social Media", "Professional Network", "Newsletter", "Referral"];

const campaignOptions = ["Web Add Lead", "ORGANIC", "PAID"];

const mediumOptions = ["Free", "CPC", "Referral", "Email"];

const countryOptions = ["India"];

const stateOptions2 = [
    "Maharashtra",
    "Karnataka",
    "Delhi",
    "Tamil Nadu",
    "Gujarat",
    "Rajasthan",
    "West Bengal",
    "Uttar Pradesh",
];

const initialFormData = {
    applicantName: "",
    emailId: "",
    alternateEmailId: "",
    whatsappNumber: "",
    alternateContactNumber: "",
    currentLocation: "",
    ugDegree: "",
    ugSpecialization: "",
    ugUniversity: "",
    ugGraduationYear: "",
    pgDegree: "",
    pgSpecialization: "",
    pgUniversity: "",
    pgGraduationYear: "",
    program: "",
    gender: "",
    stage: "01-New",
    subStage: "Not Called",
    remarks: "",
    // Family & Address Details
    fatherFullName: "",
    motherFullName: "",
    fatherMobile: "",
    motherMobile: "",
    fatherEmail: "",
    motherEmail: "",
    country: "India",
    state: "",
    district: "",
    city: "",
    address: "",
    pincode: "",
    // Source Details
    channel: "",
    source: "",
    campaign: "",
    medium: "",
};

const AddNewLead = ({ open, onClose }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [mandatoryOnly, setMandatoryOnly] = useState(false);
    const [formData, setFormData] = useState(initialFormData);

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleAdd = () => {
        onClose(formData);
    };

    const handleCancel = () => {
        setFormData(initialFormData);
        onClose(null);
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            maxWidth="md"
            fullWidth
            PaperProps={{ className: "add-lead-dialog" }}
        >
            <DialogTitle className="add-lead-title">
                Add New Lead
                <IconButton onClick={handleCancel} className="add-lead-close-btn">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <div className="add-lead-tabs-wrapper">
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    TabIndicatorProps={{ style: { display: "none" } }}
                >
                    <Tab
                        label="Lead/Applicant & Stage Details"
                        className={activeTab === 0 ? "add-lead-tab active" : "add-lead-tab"}
                    />
                    <Tab
                        label="Family & Address Details"
                        className={activeTab === 1 ? "add-lead-tab active" : "add-lead-tab"}
                    />
                    <Tab
                        label="Source Details"
                        className={activeTab === 2 ? "add-lead-tab active" : "add-lead-tab"}
                    />
                </Tabs>
            </div>

            <DialogContent className="add-lead-content">
                {/* Tab 0: Lead/Applicant & Stage Details */}
                {activeTab === 0 && (
                    <>
                        <div className="add-lead-mandatory-toggle">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={mandatoryOnly}
                                        onChange={(e) => setMandatoryOnly(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Mandatory only"
                                labelPlacement="start"
                            />
                        </div>

                        <div className="add-lead-section-title">Lead Details</div>

                        <div className="add-lead-form-grid">
                            <TextField
                                label="Applicant Name"
                                placeholder="Applicant Name"
                                required
                                size="small"
                                value={formData.applicantName}
                                onChange={handleChange("applicantName")}
                                fullWidth
                            />
                            {!mandatoryOnly && (
                                <TextField
                                    label="Email Id"
                                    placeholder="Email Id"
                                    size="small"
                                    value={formData.emailId}
                                    onChange={handleChange("emailId")}
                                    fullWidth
                                />
                            )}
                            {!mandatoryOnly && (
                                <TextField
                                    label="Alternate Email Id"
                                    placeholder="Alternate Email Id"
                                    size="small"
                                    value={formData.alternateEmailId}
                                    onChange={handleChange("alternateEmailId")}
                                    fullWidth
                                />
                            )}
                            <TextField
                                label="WhatsApp Number"
                                placeholder="WhatsApp Number"
                                required
                                size="small"
                                value={formData.whatsappNumber}
                                onChange={handleChange("whatsappNumber")}
                                fullWidth
                            />
                            {!mandatoryOnly && (
                                <>
                                    <TextField
                                        label="Alternate Contact Number"
                                        placeholder="Alternate Contact Number"
                                        size="small"
                                        value={formData.alternateContactNumber}
                                        onChange={handleChange("alternateContactNumber")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Current Location"
                                        placeholder="Current Location"
                                        size="small"
                                        value={formData.currentLocation}
                                        onChange={handleChange("currentLocation")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Under Graduation degree"
                                        placeholder="Under Graduation degree"
                                        size="small"
                                        value={formData.ugDegree}
                                        onChange={handleChange("ugDegree")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="UG Specialization"
                                        placeholder="UG Specialization"
                                        size="small"
                                        value={formData.ugSpecialization}
                                        onChange={handleChange("ugSpecialization")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="UG University/institute Name"
                                        placeholder="UG University/institute Name"
                                        size="small"
                                        value={formData.ugUniversity}
                                        onChange={handleChange("ugUniversity")}
                                        fullWidth
                                    />
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>UG Graduation Year</InputLabel>
                                        <Select
                                            label="UG Graduation Year"
                                            value={formData.ugGraduationYear}
                                            onChange={handleChange("ugGraduationYear")}
                                        >
                                            <MenuItem value="">
                                                <em>Select UG Graduation Year</em>
                                            </MenuItem>
                                            {graduationYears.map((year) => (
                                                <MenuItem key={year} value={year}>
                                                    {year}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Post graduation degree"
                                        placeholder="Post graduation degree"
                                        size="small"
                                        value={formData.pgDegree}
                                        onChange={handleChange("pgDegree")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="PG specialization"
                                        placeholder="PG specialization"
                                        size="small"
                                        value={formData.pgSpecialization}
                                        onChange={handleChange("pgSpecialization")}
                                        fullWidth
                                    />
                                    <TextField
                                        label="PG university/institute name"
                                        placeholder="PG university/institute name"
                                        size="small"
                                        value={formData.pgUniversity}
                                        onChange={handleChange("pgUniversity")}
                                        fullWidth
                                    />
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>PG Graduation Year</InputLabel>
                                        <Select
                                            label="PG Graduation Year"
                                            value={formData.pgGraduationYear}
                                            onChange={handleChange("pgGraduationYear")}
                                        >
                                            <MenuItem value="">
                                                <em>Select PG Graduation Year</em>
                                            </MenuItem>
                                            {graduationYears.map((year) => (
                                                <MenuItem key={year} value={year}>
                                                    {year}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </>
                            )}
                            <FormControl size="small" fullWidth required>
                                <InputLabel>Program</InputLabel>
                                <Select
                                    label="Program"
                                    value={formData.program}
                                    onChange={handleChange("program")}
                                >
                                    {programOptions.map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {p}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {!mandatoryOnly && (
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Gender</InputLabel>
                                    <Select
                                        label="Gender"
                                        value={formData.gender}
                                        onChange={handleChange("gender")}
                                    >
                                        <MenuItem value="">
                                            <em>Select Gender</em>
                                        </MenuItem>
                                        {genderOptions.map((g) => (
                                            <MenuItem key={g} value={g}>
                                                {g}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </div>

                        <div className="add-lead-section-title">Change Lead /Application Stage</div>

                        <div className="add-lead-form-grid">
                            <FormControl size="small" fullWidth>
                                <InputLabel>Stage</InputLabel>
                                <Select
                                    label="Stage"
                                    value={formData.stage}
                                    onChange={handleChange("stage")}
                                >
                                    {stageOptions.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Sub-Stage</InputLabel>
                                <Select
                                    label="Sub-Stage"
                                    value={formData.subStage}
                                    onChange={handleChange("subStage")}
                                >
                                    {subStageOptions.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>

                        <div className="add-lead-remarks">
                            <TextField
                                label="Remarks"
                                placeholder="Remarks"
                                size="small"
                                multiline
                                minRows={2}
                                value={formData.remarks}
                                onChange={handleChange("remarks")}
                                fullWidth
                            />
                        </div>
                    </>
                )}

                {/* Tab 1: Family & Address Details */}
                {activeTab === 1 && (
                    <>
                        <div className="add-lead-mandatory-toggle">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={mandatoryOnly}
                                        onChange={(e) => setMandatoryOnly(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Mandatory only"
                                labelPlacement="start"
                            />
                        </div>

                        <div className="add-lead-section-title">Parent's Details</div>
                        <div className="add-lead-form-grid">
                            <TextField
                                label="Father's Full Name"
                                placeholder="Father's Full Name"
                                size="small"
                                value={formData.fatherFullName}
                                onChange={handleChange("fatherFullName")}
                                fullWidth
                            />
                            <TextField
                                label="Mother's Full Name"
                                placeholder="Mother's Full Name"
                                size="small"
                                value={formData.motherFullName}
                                onChange={handleChange("motherFullName")}
                                fullWidth
                            />
                            <TextField
                                label="Father's Mobile No."
                                placeholder="Father's Mobile No."
                                size="small"
                                value={formData.fatherMobile}
                                onChange={handleChange("fatherMobile")}
                                fullWidth
                            />
                            <TextField
                                label="Mother's Mobile No."
                                placeholder="Mother's Mobile No."
                                size="small"
                                value={formData.motherMobile}
                                onChange={handleChange("motherMobile")}
                                fullWidth
                            />
                            <TextField
                                label="Father's Email Id"
                                placeholder="Father's Email Id"
                                size="small"
                                value={formData.fatherEmail}
                                onChange={handleChange("fatherEmail")}
                                fullWidth
                            />
                            <TextField
                                label="Mother's Email Id"
                                placeholder="Mother's Email Id"
                                size="small"
                                value={formData.motherEmail}
                                onChange={handleChange("motherEmail")}
                                fullWidth
                            />
                        </div>

                        <div className="add-lead-section-title">Address Details</div>
                        <div className="add-lead-form-grid">
                            <FormControl size="small" fullWidth>
                                <InputLabel>Country</InputLabel>
                                <Select
                                    label="Country"
                                    value={formData.country}
                                    onChange={handleChange("country")}
                                >
                                    {countryOptions.map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {c}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>State</InputLabel>
                                <Select
                                    label="State"
                                    value={formData.state}
                                    onChange={handleChange("state")}
                                >
                                    <MenuItem value="">
                                        <em>Select State</em>
                                    </MenuItem>
                                    {stateOptions2.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>District</InputLabel>
                                <Select
                                    label="District"
                                    value={formData.district}
                                    onChange={handleChange("district")}
                                >
                                    <MenuItem value="">
                                        <em>Select District</em>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>City</InputLabel>
                                <Select
                                    label="City"
                                    value={formData.city}
                                    onChange={handleChange("city")}
                                >
                                    <MenuItem value="">
                                        <em>Select City</em>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Address"
                                placeholder="Address"
                                size="small"
                                value={formData.address}
                                onChange={handleChange("address")}
                                fullWidth
                            />
                            <TextField
                                label="Pincode"
                                placeholder="Enter Pincode"
                                size="small"
                                value={formData.pincode}
                                onChange={handleChange("pincode")}
                                fullWidth
                            />
                        </div>
                    </>
                )}

                {/* Tab 2: Source Details */}
                {activeTab === 2 && (
                    <>
                        <div className="add-lead-mandatory-toggle">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={mandatoryOnly}
                                        onChange={(e) => setMandatoryOnly(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Mandatory only"
                                labelPlacement="start"
                            />
                        </div>

                        <div className="add-lead-form-grid">
                            <FormControl size="small" fullWidth required>
                                <InputLabel>Channel</InputLabel>
                                <Select
                                    label="Channel"
                                    value={formData.channel}
                                    onChange={handleChange("channel")}
                                >
                                    {channelOptions.map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {c}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth required>
                                <InputLabel>Source</InputLabel>
                                <Select
                                    label="Source"
                                    value={formData.source}
                                    onChange={handleChange("source")}
                                >
                                    {sourceOptions.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Campaign</InputLabel>
                                <Select
                                    label="Campaign"
                                    value={formData.campaign}
                                    onChange={handleChange("campaign")}
                                >
                                    {campaignOptions.map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {c}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Medium</InputLabel>
                                <Select
                                    label="Medium"
                                    value={formData.medium}
                                    onChange={handleChange("medium")}
                                >
                                    <MenuItem value="">
                                        <em>Select Medium</em>
                                    </MenuItem>
                                    {mediumOptions.map((m) => (
                                        <MenuItem key={m} value={m}>
                                            {m}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    </>
                )}
            </DialogContent>

            <DialogActions className="add-lead-actions">
                <Button
                    variant="outlined"
                    onClick={handleCancel}
                    className="add-lead-cancel-btn"
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleAdd}
                    className="add-lead-add-btn"
                >
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddNewLead;
