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
    CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckIcon from "@mui/icons-material/Check";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import "./UploadLeads.css";
import { colors } from "../../theme/colors";
import { bulkApi, uploadsApi } from "../../lib/endpoints";

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

// Two visible steps. Step 3 (column mapping) was removed because the
// canonical .xlsx template the user downloads already uses the exact column
// names the worker expects, so an interactive mapping step adds friction
// without value. The header row is sent as-is and matched against
// column names server-side.
const steps = ["Set Defaults", "Upload & Import"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll bulkApi.getPreview until the worker has written counts. The worker
// runs in-process so for typical sub-30k row files the first poll usually
// already has results. We start at 250ms and back off after a few tries
// to keep network noise low if a job ever takes a long time.
const waitForPreview = async (previewId, { timeoutMs = 30000 } = {}) => {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    let interval = 250;
    let polls = 0;
    while (Date.now() < deadline) {
        const r = await bulkApi.getPreview(previewId);
        last = r?.data;
        if (last && (Number(last.total_rows) > 0 || Number(last.invalid_rows) > 0)) return last;
        await sleep(interval);
        polls += 1;
        if (polls === 4) interval = 1000;   // back off after 1s of fast polling
        if (polls === 12) interval = 2000;  // back off again after ~10s total
    }
    return last;
};

const UploadLeads = ({ open, onClose }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [channel, setChannel] = useState("Offline");
    const [source, setSource] = useState("Direct Walkin");
    const [stage, setStage] = useState("01-New");
    const [subStage, setSubStage] = useState("Not Called");
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
    const [sendWelcomeSMS, setSendWelcomeSMS] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleClose = () => {
        // Don't let the user close mid-upload by clicking outside the dialog —
        // the import job is already in flight server-side, so closing here
        // wouldn't cancel it, but resetting state would orphan the result.
        if (busy) return;
        setActiveStep(0);
        setUploadedFile(null);
        setBusy(false);
        setBusyLabel("");
        setResult(null);
        setError(null);
        onClose();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadedFile(file);
        setError(null);
        setResult(null);
    };

    const handleDownloadTemplate = async (format) => {
        try {
            await bulkApi.downloadTemplate({ format });
        } catch (e) {
            alert(e?.message || "Could not download template");
        }
    };

    // Run the full upload pipeline: presign → PUT → preview → poll → commit.
    // The user clicks "Next" on the Upload step to trigger this; result is
    // displayed inline so they can see counts before closing.
    const runImport = async () => {
        if (!uploadedFile) {
            setError("Please pick a file before uploading.");
            return;
        }
        setBusy(true);
        setError(null);
        setResult(null);
        try {
            // 1. Presign — server returns a signed PUT URL pointing at GCS.
            setBusyLabel("Requesting upload URL…");
            const presignResp = await uploadsApi.presign({
                purpose: "csv_import",
                content_type: uploadedFile.type || "application/octet-stream",
                size_bytes: uploadedFile.size,
                filename: uploadedFile.name,
            });
            const presign = presignResp?.data;
            if (!presign?.upload_url || !presign?.r2_key) {
                throw new Error("Presign response was missing upload_url / r2_key");
            }

            // 2. Direct-to-GCS upload. The signed URL has the content type baked
            // in, so we MUST send the same Content-Type header — otherwise GCS
            // rejects the PUT with a signature mismatch.
            setBusyLabel("Uploading file…");
            const putRes = await fetch(presign.upload_url, {
                method: "PUT",
                headers: presign.headers || {},
                body: uploadedFile,
            });
            if (!putRes.ok) {
                throw new Error(`Upload to storage failed (${putRes.status})`);
            }

            // 3. Kick off the preview job. Defaults from Step 1 fill in
            // columns the spreadsheet leaves blank — channel/source/stage/
            // sub_stage from the dialog, and the welcome-flag toggles.
            // Field mapping is identity (header = field name) since we
            // removed the Step 3 mapper.
            setBusyLabel("Validating rows…");
            const previewKick = await bulkApi.preview({
                r2_key: presign.r2_key,
                field_mapping: {},
                defaults: {
                    channel,
                    source,
                    stage,
                    sub_stage: subStage,
                },
            });
            const previewId = previewKick?.data?.id;
            if (!previewId) throw new Error("Preview returned no id");

            // 4. Poll the preview until it has counts. Cheap fan-out
            // because the worker is fast for sub-30k rows.
            const preview = await waitForPreview(previewId);

            // 5. Commit. duplicate_handling = 'skip' is the default and matches
            // your "show duplicates on /failedleads" requirement. Pass the
            // human file name so the Bulk Upload list page can show
            // "leads-april.xlsx" rather than the opaque storage key.
            setBusyLabel("Importing leads…");
            const commitResp = await bulkApi.commit({
                preview_id: previewId,
                duplicate_handling: "skip",
                send_welcome_email: sendWelcomeEmail,
                send_welcome_sms: sendWelcomeSMS,
                file_name: uploadedFile.name,
                file_size: uploadedFile.size,
            });
            const importRow = commitResp?.data;
            setResult({
                preview,
                importId: importRow?.id,
            });
            setBusyLabel("Import queued. Auto-assignment will run shortly.");
        } catch (e) {
            setError(e?.message || "Import failed");
        } finally {
            setBusy(false);
        }
    };

    const handleNext = async () => {
        if (activeStep === 0) {
            setActiveStep(1);
            return;
        }
        if (activeStep === 1) {
            // First click: run the import. After that completes, the same
            // button becomes "Done" and closes the dialog.
            if (!result && !busy) {
                await runImport();
                return;
            }
            handleClose();
        }
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
                        You can upload an .xlsx (or .csv) file with up to 30,000 rows.
                    </li>
                    <li>You cannot upload more than 1 file at the same time.</li>
                    <li>Duplicate detection uses email + WhatsApp number. Duplicates appear on the Failed Leads page.</li>
                </ul>
            </div>

            <div className="upload-leads-status-section">
                <h4>Default values for this batch</h4>
                <p>
                    These defaults fill in any column the spreadsheet leaves blank. Per-row values in the file always win.
                </p>

                <div className="upload-leads-form-grid">
                    <div className="upload-leads-field">
                        <label className="upload-leads-field-label">Channel</label>
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
                        <label className="upload-leads-field-label">Source</label>
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
                        <label className="upload-leads-field-label">Stage</label>
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
                        <label className="upload-leads-field-label">Sub-Stage</label>
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
            <h4>Upload file with prospect candidate details</h4>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 0, marginBottom: 12 }}>
                Don&apos;t have a file? Download the template, fill in your leads, and upload it back.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => handleDownloadTemplate("xlsx")}
                    disabled={busy}
                >
                    Download Template (.xlsx)
                </Button>
                <Button
                    variant="text"
                    size="small"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => handleDownloadTemplate("csv")}
                    sx={{ color: colors.textSecondary }}
                    disabled={busy}
                >
                    Download .csv
                </Button>
            </div>
            <input
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
            />
            <Button
                variant="outlined"
                className="upload-leads-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
            >
                {uploadedFile ? "Choose a different file" : "Choose file"}
            </Button>
            {uploadedFile && (
                <p style={{ marginTop: 12, fontSize: 13, color: colors.textSecondary }}>
                    Selected: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                </p>
            )}

            {busy && (
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                    <CircularProgress size={20} />
                    <span style={{ fontSize: 14, color: colors.textSecondary }}>{busyLabel}</span>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: 24,
                    padding: 12,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    color: "#991b1b",
                    fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{
                    marginTop: 24,
                    padding: 12,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    fontSize: 13,
                }}>
                    <div style={{ fontWeight: 600, color: "#166534", marginBottom: 6 }}>
                        Import queued
                    </div>
                    <div style={{ color: "#166534" }}>
                        {result.preview?.total_rows ?? "?"} rows ·{" "}
                        {result.preview?.valid_rows ?? "?"} valid ·{" "}
                        {result.preview?.invalid_rows ?? 0} invalid ·{" "}
                        {result.preview?.duplicate_rows ?? 0} duplicates
                    </div>
                    <div style={{ color: "#166534", marginTop: 6 }}>
                        Auto-assignment runs after the import finishes. Check the Failed Leads page for any rejected rows.
                    </div>
                </div>
            )}
        </div>
    );

    const nextLabel = (() => {
        if (activeStep === 0) return "Next";
        if (busy) return "Working…";
        if (result) return "Done";
        return "Upload & Import";
    })();

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
                <IconButton onClick={handleClose} className="upload-leads-close-btn" disabled={busy}>
                    <CloseIcon />
                </IconButton>
            </div>

            {renderStepper()}

            <DialogContent className="upload-leads-content">
                {activeStep === 0 && renderStep1()}
                {activeStep === 1 && renderStep2()}
            </DialogContent>

            <DialogActions className="upload-leads-actions">
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    className="upload-leads-cancel-btn"
                    disabled={busy}
                >
                    {result ? "Close" : "Cancel"}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleNext}
                    className="upload-leads-next-btn"
                    disabled={busy || (activeStep === 1 && !uploadedFile && !result)}
                >
                    {nextLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadLeads;
