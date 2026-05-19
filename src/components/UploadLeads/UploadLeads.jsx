import React, { useState, useRef, useEffect } from "react";
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
    LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckIcon from "@mui/icons-material/Check";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import "./UploadLeads.css";
import { colors } from "../../theme/colors";
import { bulkApi, uploadsApi } from "../../lib/endpoints";
import { onNotification } from "../../lib/socket";

const channelOptions = ["Offline", "Online", "Direct", "Facebook", "Google Ads", "LinkedIn", "Email Campaign"];
const sourceOptions = ["Direct Walkin", "Website", "Social Media", "Professional Network", "Newsletter", "Referral"];

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
// Polls the preview row until its row-counts are populated (worker has
// finished its pass over the sheet) or the timeout expires. The optional
// onTick callback fires after every poll with the current attempt count so
// the dialog can render "Validating rows… (N)" instead of a frozen label.
const waitForPreview = async (previewId, { timeoutMs = 30000, onTick } = {}) => {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    let interval = 150;
    let polls = 0;
    while (Date.now() < deadline) {
        const r = await bulkApi.getPreview(previewId);
        last = r?.data;
        if (last && (Number(last.total_rows) > 0 || Number(last.invalid_rows) > 0)) return last;
        polls += 1;
        if (onTick) try { onTick(polls); } catch { /* ignore */ }
        await sleep(interval);
        if (polls === 6)  interval = 500;   // back off after ~1s of fast polling
        if (polls === 14) interval = 1500;  // back off again after ~5s total
    }
    return last;
};

const UploadLeads = ({ open, onClose, onUploaded }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [channel, setChannel] = useState("Offline");
    const [source, setSource] = useState("Direct Walkin");
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
    const [sendWelcomeSMS, setSendWelcomeSMS] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    // Live row-by-row progress streamed from the BE worker over the socket.
    // Shape mirrors the server's payload — see bulk-import-worker.js
    // emitProgress(). null until the first event arrives.
    const [progress, setProgress] = useState(null);
    // The current import_id we're tracking — set right after bulkApi.commit
    // succeeds. We use it to filter incoming socket events so two concurrent
    // imports in different tabs don't bleed into each other.
    const trackedImportIdRef = useRef(null);
    const fileInputRef = useRef(null);

    // Subscribe to `bulk_import.progress` events for the active import.
    // The subscription is component-scoped: closing the dialog (which
    // unmounts when wrapped properly) tears it down.
    useEffect(() => {
        if (!open) return undefined;
        const unsubscribe = onNotification((evt) => {
            if (!evt || evt.type !== 'bulk_import.progress') return;
            const p = evt.payload || {};
            const trackedId = trackedImportIdRef.current;
            // Accept the event when (a) we already know our import id and it
            // matches, or (b) we don't have one yet (race: server emits the
            // first tick before our commit() response landed).
            if (trackedId && p.import_id && p.import_id !== trackedId) return;
            setProgress(p);
        });
        return unsubscribe;
    }, [open]);

    const handleClose = () => {
        // Don't let the user close mid-upload by clicking outside the dialog —
        // the import job is already in flight server-side, so closing here
        // wouldn't cancel it, but resetting state would orphan the result.
        if (busy) return;
        // If the user is closing AFTER a successful import, kick the parent
        // to refetch one more time. We already called onUploaded right after
        // commit; this catch-up handles the case where auto-assignment
        // finished in the background between then and now (so the list
        // shows the correct owner instead of "Unassigned").
        const hadSuccessfulImport = !!result;
        setActiveStep(0);
        setUploadedFile(null);
        setBusy(false);
        setBusyLabel("");
        setResult(null);
        setError(null);
        setProgress(null);
        trackedImportIdRef.current = null;
        onClose();
        if (hadSuccessfulImport) {
            try { onUploaded?.(); } catch { /* parent errors must not break close */ }
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Only .xlsx is accepted — CSV is intentionally blocked because the
        // template's dropdowns / data-validation rules don't survive a CSV.
        if (!/\.xlsx$/i.test(file.name)) {
            setError("Only .xlsx files are supported. Please re-save your file as Excel (.xlsx).");
            setUploadedFile(null);
            // Reset the input so the same file can be picked again after fixing.
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
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
        setProgress(null);
        trackedImportIdRef.current = null;
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
                // Stage / sub_stage are required per-row in the spreadsheet,
                // so we don't ship batch defaults for them — the file is the
                // source of truth.
                defaults: { channel, source },
            });
            const previewId = previewKick?.data?.id;
            if (!previewId) throw new Error("Preview returned no id");

            // 4. Poll the preview until it has counts. Cheap fan-out
            // because the worker is fast for sub-30k rows. onTick updates
            // the busy label so the user sees "Validating rows… (3)" rather
            // than a label that never changes for 30 seconds.
            const preview = await waitForPreview(previewId, {
                onTick: (n) => setBusyLabel(`Validating rows… (${n})`),
            });

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
            trackedImportIdRef.current = importRow?.id || null;

            // Socket-driven progress is best-effort: if the worker finishes
            // before the first event reaches us (very small files), or the
            // socket isn't connected in this environment, we'd otherwise
            // stay stuck in the spinner state forever. Synthesize a
            // "completed" progress tick from the preview counts so the bar
            // renders at 100% with the actual import stats. Real socket
            // events still take precedence — useEffect will overwrite this.
            setProgress({
                import_id: importRow?.id,
                total: Number(preview?.total_rows) || 0,
                processed: Number(preview?.total_rows) || 0,
                success: Number(preview?.valid_rows) || 0,
                failed: Number(preview?.invalid_rows) || 0,
                duplicates: Number(preview?.duplicate_rows) || 0,
                phase: 'completed',
            });

            setResult({
                preview,
                importId: importRow?.id,
                final: null,
            });
            setBusyLabel("Import queued. Auto-assignment will run shortly.");

            // Tell the parent (LeadList) that new leads are now in the DB so
            // it can refetch in the background. We do this BEFORE the user
            // dismisses the dialog so the list is already fresh by the time
            // they click "Done" — no manual reload needed.
            //
            // Auto-assignment runs server-side after this point; the parent
            // typically subscribes to socket events too (bulk_import.progress
            // phase=completed) to catch the final assignment state, but
            // firing now covers the common case where the user closes the
            // dialog immediately after seeing the success panel.
            try { onUploaded?.(); } catch { /* parent errors must not break the dialog */ }

            // Poll the bulk_imports row for authoritative final counts.
            //
            // preview.valid_rows is the PRE-resolver count — it only checked
            // basic format (email regex, phone digits, identity present).
            // Resolver failures (OWNER_MISMATCH, COUNTRY_NOT_FOUND, etc.)
            // happen later and bump bulk_imports.failed_rows, which is the
            // only count the user can trust as "actually inserted".
            //
            // We poll for up to ~6s post-commit; tiny files complete in <1s,
            // and even mid-sized imports settle inside this window. If the
            // poll times out the panel falls back to the preview numbers
            // and a warning that final stats may still be updating.
            (async () => {
                const importId = importRow?.id;
                if (!importId) return;
                const deadline = Date.now() + 6000;
                let interval = 300;
                while (Date.now() < deadline) {
                    try {
                        const r = await bulkApi.import(importId);
                        const row = r?.data;
                        if (row && row.status === 'completed') {
                            setResult((prev) => prev ? { ...prev, final: row } : prev);
                            return;
                        }
                    } catch { /* keep polling */ }
                    await sleep(interval);
                    if (interval < 1000) interval = Math.min(1000, interval + 100);
                }
                // Timed out — leave final null; UI shows the preview numbers
                // with a "stats may still be updating" hint.
            })();
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
                    <li>Upload an <b>.xlsx</b> file (max 30,000 rows). CSV is not supported — please convert to .xlsx.</li>
                    <li>
                        Owner columns: <code>current_lead_owner_email</code> and <code>assigned_to_email</code> behave the same way and accept ANY active user email —
                        counsellor email assigns the lead directly, sales-manager email round-robins across their team,
                        super-admin email round-robins across the tenant. If both columns are set they must point to the
                        SAME user (else <code>OWNER_MISMATCH</code>). Leave both blank to let the auto-assignment rule pick.
                        Use <code>previous_lead_owner_email</code> (optional) to record a prior owner in the lead's history.
                    </li>
                    <li>
                        New <code>primary_source</code> column is auto-created (case-insensitive match) on first use,
                        the same way channel / source / campaign / medium already are.
                    </li>
                    <li>You cannot upload more than 1 file at the same time.</li>
                    <li>Every row must have at least one of <b>email / first_name / last_name</b>, at least one of <b>whatsapp_number / phone</b>, and a <b>stage</b>. Sub-stage is required only when the chosen stage has sub-stages configured.</li>
                    <li>Duplicate detection uses email, phone, and WhatsApp number. Duplicates appear on the Failed Leads page.</li>
                    <li>
                        <b>Follow-up history:</b> use <code>followup_scheduled_on</code> / <code>followup_comments</code> for the upcoming
                        planned follow-up, and <code>next_action_date_1..5</code> / <code>comment_1..5</code> for up to 5 past attempts
                        (most recent first). Past attempts are stored as completed follow-ups.
                    </li>
                    <li>
                        <b>Audit timestamps:</b> <code>lead_created_on</code> and <code>lead_updated_on</code> are optional. If provided,
                        they override the server&apos;s default <code>now()</code>. Format: <code>DD-MM-YYYY HH:mm:ss</code>
                        (e.g. <code>14-04-2026 13:07:56</code>).
                    </li>
                </ul>
            </div>

            <div className="upload-leads-status-section">
                <h4>Default values for this batch</h4>
                <p>
                    These defaults fill in any column the spreadsheet leaves blank. Per-row values in the file always win.
                    Stage and sub-stage are required per row in the file itself, so they aren&apos;t set here.
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
            </div>
            <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                <div style={{ marginTop: 24 }}>
                    {/* Pre-progress placeholder: presign / upload / preview phases
                        where the BE hasn't started emitting per-row events yet. */}
                    {!progress && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <CircularProgress size={20} />
                            <span style={{ fontSize: 14, color: colors.textSecondary }}>{busyLabel}</span>
                        </div>
                    )}

                    {/* Live progress, driven by `bulk_import.progress` socket
                        events from the worker. Shows row N of M plus a bar plus
                        success / failed / duplicate sub-counts so the user has
                        a sense of import quality, not just speed. */}
                    {progress && (() => {
                        const total = Math.max(1, Number(progress.total) || 0);
                        const processed = Math.min(total, Number(progress.processed) || 0);
                        const pct = Math.round((processed / total) * 100);
                        const phaseLabel = progress.phase === 'auto_assigning'
                            ? 'Running auto-assignment…'
                            : progress.phase === 'completed'
                                ? 'Done. Finalising…'
                                : `Importing row ${processed.toLocaleString()} of ${total.toLocaleString()}`;
                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{phaseLabel}</span>
                                    <span style={{ fontSize: 13, color: colors.textSecondary }}>{pct}%</span>
                                </div>
                                <LinearProgress
                                    variant={progress.phase === 'auto_assigning' ? 'indeterminate' : 'determinate'}
                                    value={pct}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        background: '#f1f5f9',
                                        '& .MuiLinearProgress-bar': { background: colors.primary },
                                    }}
                                />
                                <div style={{
                                    display: 'flex',
                                    gap: 16,
                                    marginTop: 10,
                                    fontSize: 12,
                                    color: colors.textSecondary,
                                }}>
                                    <span><strong style={{ color: '#166534' }}>{(progress.success ?? 0).toLocaleString()}</strong> imported</span>
                                    <span><strong style={{ color: '#c62828' }}>{(progress.failed ?? 0).toLocaleString()}</strong> failed</span>
                                    <span><strong style={{ color: '#d97706' }}>{(progress.duplicates ?? 0).toLocaleString()}</strong> duplicates</span>
                                </div>
                            </div>
                        );
                    })()}
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

            {result && (() => {
                // Prefer the final bulk_imports row (authoritative — includes
                // resolver failures like OWNER_MISMATCH that the pre-resolver
                // "preview" pass can't see). Fall back to preview while the
                // post-commit poll is still in flight.
                const final = result.final;
                const total       = final?.total_rows       ?? result.preview?.total_rows       ?? 0;
                const imported    = final?.success_rows     ?? result.preview?.valid_rows       ?? 0;
                const failed      = final?.failed_rows      ?? result.preview?.invalid_rows     ?? 0;
                const duplicates  = final?.duplicate_rows   ?? result.preview?.duplicate_rows   ?? 0;
                const hasFinal = Boolean(final);
                const anyFailed = failed > 0;

                // Tone the banner red when ANY row failed, green otherwise.
                // Mixed outcomes (some imported, some failed) still get the
                // red treatment so the user doesn't miss the failures — a
                // hidden 1-of-1-failed import is exactly the bug this fixes.
                const bg     = anyFailed ? '#fff1f2' : '#f0fdf4';
                const border = anyFailed ? '#fecdd3' : '#bbf7d0';
                const heading = anyFailed
                    ? (imported > 0 ? 'Import finished with errors' : 'Import failed — no rows inserted')
                    : 'Import complete';
                const headingColor = anyFailed ? '#9f1239' : '#166534';
                const bodyColor    = anyFailed ? '#9f1239' : '#166534';

                return (
                    <div style={{
                        marginTop: 24,
                        padding: 12,
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 6,
                        fontSize: 13,
                    }}>
                        <div style={{ fontWeight: 600, color: headingColor, marginBottom: 6 }}>
                            {heading}
                        </div>
                        <div style={{ color: bodyColor }}>
                            <strong>{total}</strong> row{total === 1 ? '' : 's'} ·{' '}
                            <span style={{ color: '#15803d', fontWeight: 600 }}>{imported} imported</span> ·{' '}
                            <span style={{ color: anyFailed ? '#b91c1c' : bodyColor, fontWeight: anyFailed ? 700 : 400 }}>
                                {failed} failed
                            </span> ·{' '}
                            <span style={{ color: '#b45309' }}>{duplicates} duplicate{duplicates === 1 ? '' : 's'}</span>
                        </div>
                        {anyFailed && (
                            <div style={{ color: '#9f1239', marginTop: 6, fontWeight: 500 }}>
                                Open the <strong>Failed Leads</strong> page to see exactly which rows failed and why
                                (errors include OWNER_MISMATCH, INVALID_EMAIL, STAGE_NOT_FOUND, etc.).
                            </div>
                        )}
                        {!hasFinal && (
                            <div style={{ color: '#92400e', marginTop: 6, fontStyle: 'italic' }}>
                                Final counts still updating — refresh in a moment if numbers change.
                            </div>
                        )}
                        <div style={{ color: bodyColor, marginTop: 6 }}>
                            Auto-assignment runs after the import finishes.
                        </div>
                    </div>
                );
            })()}
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
