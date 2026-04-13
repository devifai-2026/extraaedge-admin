import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogActions,
    IconButton,
    TextField,
    Autocomplete,
    Checkbox,
    FormControlLabel,
    Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckIcon from "@mui/icons-material/Check";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import "./UploadLeads.css";
import { colors } from "../../theme/colors";

const channelOptions = ["Offline", "Online", "Direct", "Facebook", "Google Ads", "LinkedIn", "Email Campaign"];
const sourceOptions = ["Direct Walkin", "Website", "Social Media", "Professional Network", "Newsletter", "Referral"];
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

const crmFieldOptions = [
    "Email Id",
    "First Name",
    "Last Name",
    "Phone Number",
    "WhatsApp Number",
    "City",
    "State",
    "Country",
    "Program",
    "Stage",
    "Sub-Stage",
    "Channel",
    "Source",
    "Campaign",
    "Medium",
    "Remarks",
];

const steps = ["Map fields", "Upload File", "Validate File"];

const UploadLeads = ({ open, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [channel, setChannel] = useState("Offline");
    const [source, setSource] = useState("Direct Walkin");
    const [stage, setStage] = useState("01-New");
    const [subStage, setSubStage] = useState("Not Called");
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
    const [sendWelcomeSMS, setSendWelcomeSMS] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [sheetFields, setSheetFields] = useState([]);
    const [fieldMapping, setFieldMapping] = useState({});
    const fileInputRef = useRef(null);

    const handleClose = () => {
        setActiveStep(0);
        setUploadedFile(null);
        setSheetFields([]);
        setFieldMapping({});
        onClose();
    };

    const handleNext = () => {
        if (activeStep < steps.length - 1) {
            setActiveStep((prev) => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadedFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const firstLine = text.split("\n")[0];
            const headers = firstLine.split(",").map((h) => h.trim().replace(/"/g, ""));
            setSheetFields(headers);

            const autoMap = {};
            headers.forEach((header) => {
                const match = crmFieldOptions.find(
                    (crm) => crm.toLowerCase() === header.toLowerCase()
                );
                if (match) autoMap[header] = match;
            });
            setFieldMapping(autoMap);
        };
        reader.readAsText(file);
    };

    const handleMappingChange = (sheetField, crmField) => {
        setFieldMapping((prev) => ({ ...prev, [sheetField]: crmField }));
    };

    const renderStepper = () => (
        <div className="upload-leads-stepper">
            {steps.map((label, index) => (
                <React.Fragment key={label}>
                    <div className="upload-leads-step">
                        <div
                            className={`upload-leads-step-circle ${
                                index < activeStep
                                    ? "completed"
                                    : index === activeStep
                                    ? "active"
                                    : ""
                            }`}
                        >
                            {index < activeStep ? <CheckIcon fontSize="small" /> : null}
                        </div>
                        <div
                            className={`upload-leads-step-label ${
                                index === activeStep ? "active" : ""
                            }`}
                        >
                            {label}
                        </div>
                    </div>
                    {index < steps.length - 1 && (
                        <div
                            className={`upload-leads-step-connector ${
                                index < activeStep ? "completed" : ""
                            }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <>
            <div className="upload-leads-instructions">
                <div className="upload-leads-instructions-header">
                    <InfoOutlinedIcon className="info-icon" fontSize="small" />
                    <p>Please follow the instructions mentioned below</p>
                </div>
                <ul>
                    <li>
                        You can upload a CSV file with a maximum of 10000 rows. Exceeding
                        this limit will result in an error.
                    </li>
                    <li>You cannot upload more than 1 files at the same time.</li>
                </ul>
                <span className="upload-leads-read-more">Read More</span>
            </div>

            <div className="upload-leads-status-section">
                <h4>Lead Status Details.</h4>
                <p>
                    Please Click here to download reference values insert All Dropdown
                    details in upload sheet.
                </p>

                <div className="upload-leads-form-grid">
                    <div className="upload-leads-field">
                        <label className="upload-leads-field-label">Channel<span className="required">*</span></label>
                        <Autocomplete
                            size="small"
                            fullWidth
                            options={channelOptions}
                            value={channel}
                            onChange={(_, val) => setChannel(val)}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Channel" />
                            )}
                        />
                    </div>

                    <div className="upload-leads-field">
                        <label className="upload-leads-field-label">Source<span className="required">*</span></label>
                        <Autocomplete
                            size="small"
                            fullWidth
                            options={sourceOptions}
                            value={source}
                            onChange={(_, val) => setSource(val)}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Source" />
                            )}
                        />
                    </div>

                    <div className="upload-leads-field">
                        <label className="upload-leads-field-label">Stage<span className="required">*</span></label>
                        <Autocomplete
                            size="small"
                            fullWidth
                            options={stageOptions}
                            value={stage}
                            onChange={(_, val) => setStage(val)}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Stage" />
                            )}
                        />
                    </div>

                    <div className="upload-leads-field">
                        <label className="upload-leads-field-label">Sub-Stage<span className="required">*</span></label>
                        <Autocomplete
                            size="small"
                            fullWidth
                            options={subStageOptions}
                            value={subStage}
                            onChange={(_, val) => setSubStage(val)}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Sub-Stage" />
                            )}
                        />
                    </div>
                </div>

                <div className="upload-leads-checkboxes">
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={sendWelcomeEmail}
                                onChange={(e) => setSendWelcomeEmail(e.target.checked)}
                            />
                        }
                        label="Send Welcome Email"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={sendWelcomeSMS}
                                onChange={(e) => setSendWelcomeSMS(e.target.checked)}
                            />
                        }
                        label="Send Welcome SMS"
                    />
                </div>
            </div>
        </>
    );

    const renderStep2 = () => (
        <div className="upload-leads-file-section">
            <h4>
                Step 2: Upload file with prospect candidate details
                <FileDownloadIcon className="download-icon" />
            </h4>
            <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
            />
            <Button
                variant="outlined"
                className="upload-leads-upload-btn"
                onClick={() => fileInputRef.current?.click()}
            >
                Upload File
            </Button>
            {uploadedFile && (
                <p style={{ marginTop: 12, fontSize: 13, color: colors.textSecondary }}>
                    Selected: {uploadedFile.name}
                </p>
            )}
        </div>
    );

    const renderStep3 = () => (
        <>
            <div className="upload-leads-mapping-header">
                Step 3: Map the column names
            </div>
            <div className="upload-leads-mapping-columns">
                <span>Sheet Fields</span>
                <span>CRM Fields</span>
            </div>
            {sheetFields.map((field) => (
                <div key={field} className="upload-leads-mapping-row">
                    <div className="sheet-field">
                        <span>{field}</span>
                        <ArrowForwardIcon className="arrow" />
                    </div>
                    <div className="crm-field">
                        <Autocomplete
                            size="small"
                            fullWidth
                            options={crmFieldOptions}
                            value={fieldMapping[field] || null}
                            onChange={(_, val) =>
                                handleMappingChange(field, val || "")
                            }
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Select Field" />
                            )}
                        />
                    </div>
                </div>
            ))}
            {sheetFields.length === 0 && (
                <p style={{ color: colors.midGrey, fontSize: 13 }}>
                    No file uploaded yet. Please go back and upload a CSV file.
                </p>
            )}
        </>
    );

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            className="upload-leads-dialog"
        >
            <div className="upload-leads-title">
                Upload Leads
                <IconButton onClick={handleClose} className="upload-leads-close-btn">
                    <CloseIcon />
                </IconButton>
            </div>

            {renderStepper()}

            <DialogContent className="upload-leads-content">
                {activeStep === 0 && renderStep1()}
                {activeStep === 1 && renderStep2()}
                {activeStep === 2 && renderStep3()}
            </DialogContent>

            <DialogActions className="upload-leads-actions">
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    className="upload-leads-cancel-btn"
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleNext}
                    className="upload-leads-next-btn"
                >
                    Next
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadLeads;
