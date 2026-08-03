import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogActions, IconButton, Button, Alert,
  CircularProgress, LinearProgress, FormControl, Select, MenuItem, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { bulkAdmissionsApi, uploadsApi } from '../../lib/endpoints';
import { onNotification } from '../../lib/socket';
import './UploadAdmissions.css';

const MAX_SHEET_BYTES = 25 * 1024 * 1024;   // mirrors the csv_import presign cap
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // mirrors admission_photo

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll the preview row until the worker has written counts, or we give up.
// This importer validates far more per row than the lead one (five tables'
// worth of rules, plus a UTR lookup per payment), so the ceiling is higher —
// a 30s timeout would abandon a legitimate 500-row file mid-validation.
const waitForPreview = async (previewId, { timeoutMs = 90_000, onTick } = {}) => {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  let interval = 200;
  let polls = 0;
  while (Date.now() < deadline) {
    const r = await bulkAdmissionsApi.getPreview(previewId);
    last = r?.data;
    if (last && (Number(last.total_rows) > 0 || Number(last.invalid_rows) > 0)) return last;
    polls += 1;
    if (onTick) try { onTick(polls); } catch { /* ignore */ }
    await sleep(interval);
    if (polls === 6) interval = 600;
    if (polls === 16) interval = 2000;
  }
  return last;
};

const UploadAdmissions = ({ open, onClose, onUploaded }) => {
  const [sheet, setSheet] = useState(null);
  const [images, setImages] = useState([]);          // File[] for photos + payment proofs
  const [duplicateHandling, setDuplicateHandling] = useState('use_existing');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const trackedImportIdRef = useRef(null);
  const sheetInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Live row-by-row progress from the worker. Filtered by import id so two
  // imports open in different tabs don't bleed into each other.
  useEffect(() => {
    if (!open) return undefined;
    return onNotification((evt) => {
      if (!evt || evt.type !== 'bulk_import.progress') return;
      const p = evt.payload || {};
      // The lead importer emits on the same channel — ignore its ticks.
      if (p.kind !== 'admissions') return;
      const tracked = trackedImportIdRef.current;
      if (tracked && p.import_id && p.import_id !== tracked) return;
      setProgress(p);
    });
  }, [open]);

  const reset = useCallback(() => {
    setSheet(null);
    setImages([]);
    setBusy(false);
    setBusyLabel('');
    setError(null);
    setResult(null);
    setProgress(null);
    trackedImportIdRef.current = null;
    if (sheetInputRef.current) sheetInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, []);

  const handleClose = () => {
    // The job is already server-side; closing wouldn't cancel it, but
    // resetting state here would orphan the result the user is reading.
    if (busy) return;
    const imported = Boolean(result);
    reset();
    onClose();
    if (imported) { try { onUploaded?.(); } catch { /* parent errors must not break close */ } }
  };

  const pickSheet = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Only .xlsx files are supported. Re-save your file as Excel (.xlsx).');
      setSheet(null);
      if (sheetInputRef.current) sheetInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_SHEET_BYTES) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB; max 25 MB). `
        + 'Re-save it as a fresh .xlsx (Save As → Excel Workbook) to drop hidden template data.',
      );
      setSheet(null);
      if (sheetInputRef.current) sheetInputRef.current.value = '';
      return;
    }
    setSheet(file);
    setError(null);
    setResult(null);
  };

  const pickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    const tooBig = picked.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than 10 MB. Compress it and try again.`);
      return;
    }
    // Merge with whatever's already picked, de-duped by name — operators
    // routinely select photos in a few goes (one folder per batch), and a
    // second pick replacing the first would silently lose the earlier files.
    setImages((prev) => {
      const byName = new Map(prev.map((f) => [f.name.toLowerCase(), f]));
      for (const f of picked) byName.set(f.name.toLowerCase(), f);
      return [...byName.values()];
    });
    setError(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const downloadTemplate = async () => {
    try {
      await bulkAdmissionsApi.downloadTemplate();
    } catch (e) {
      setError(e?.message || 'Could not download the template');
    }
  };

  // Upload every attached image and build the { file name → r2 key } map the
  // worker matches photo_file_name / *_proof_file_name against.
  const uploadImages = async () => {
    const map = {};
    for (const [i, file] of images.entries()) {
      setBusyLabel(`Uploading images… (${i + 1}/${images.length})`);
      const ps = await uploadsApi.presign({
        purpose: 'admission_photo',
        content_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        filename: file.name,
      });
      const presign = ps?.data;
      if (!presign?.upload_url || !presign?.r2_key) throw new Error(`Could not get an upload URL for "${file.name}"`);
      const put = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: presign.headers || { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload of "${file.name}" failed (${put.status})`);
      await uploadsApi.confirm({ purpose: 'admission_photo', r2_key: presign.r2_key });
      map[file.name] = presign.r2_key;
    }
    return map;
  };

  const runImport = async () => {
    if (!sheet) { setError('Pick your filled-in template first.'); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(null);
    trackedImportIdRef.current = null;
    try {
      // 1. Images first. If one fails we stop before creating any records,
      //    rather than importing half the students without their proofs.
      const attachments = images.length ? await uploadImages() : {};

      // 2. Presign + direct-to-storage PUT for the sheet itself.
      setBusyLabel('Requesting upload URL…');
      const ps = await uploadsApi.presign({
        purpose: 'csv_import',
        content_type: sheet.type || 'application/octet-stream',
        size_bytes: sheet.size,
        filename: sheet.name,
      });
      const presign = ps?.data;
      if (!presign?.upload_url || !presign?.r2_key) throw new Error('Presign response was missing upload_url / r2_key');

      setBusyLabel('Uploading spreadsheet…');
      // The signed URL bakes in the content type, so the same header must go
      // back or storage rejects the PUT with a signature mismatch.
      const put = await fetch(presign.upload_url, { method: 'PUT', headers: presign.headers || {}, body: sheet });
      if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);

      // 3. Dry run. Nothing is written; this is what the user reviews.
      setBusyLabel('Checking rows…');
      const kick = await bulkAdmissionsApi.preview({ r2_key: presign.r2_key, field_mapping: {}, defaults: {} });
      const previewId = kick?.data?.id;
      if (!previewId) throw new Error('Preview returned no id');

      const preview = await waitForPreview(previewId, {
        onTick: (n) => setBusyLabel(`Checking rows… (${n})`),
      });

      // Whole-file parse failure: the worker flags it with a row_number 0
      // sample error and zero rows. Surface that instead of committing
      // an empty import.
      const fileError = Number(preview?.total_rows) === 0
        && (preview?.sample_errors_json || []).find((e) => e?.row_number === 0);
      if (fileError) throw new Error(fileError.message || 'Could not read this spreadsheet.');
      if (!preview) throw new Error('Checking timed out. The server may be busy — try again in a moment.');

      // Carry the attachment map through to commit — the images are already
      // in storage, so re-picking them at commit time would upload twice.
      setResult({ preview, previewId, attachments, committed: false });
      setBusyLabel('');
    } catch (e) {
      setError(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  // Separate step from runImport on purpose: this importer writes money, so
  // the operator sees the validation counts and confirms before anything is
  // created. The lead importer can auto-commit; this one shouldn't.
  const commitImport = async () => {
    if (!result?.previewId) return;
    setBusy(true);
    setError(null);
    try {
      setBusyLabel('Importing admissions…');
      const resp = await bulkAdmissionsApi.commit({
        preview_id: result.previewId,
        duplicate_handling: duplicateHandling,
        attachments: result.attachments || {},
        file_name: sheet?.name,
        file_size: sheet?.size,
      });
      const importRow = resp?.data;
      trackedImportIdRef.current = importRow?.id || null;
      setResult((r) => ({ ...r, committed: true, importId: importRow?.id }));
      setBusyLabel('Import queued.');
      try { onUploaded?.(); } catch { /* parent errors must not break the import */ }
    } catch (e) {
      setError(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const pv = result?.preview;
  const pct = progress?.total ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <div className="ua-head">
        <div>
          <div className="ua-title">Import past admissions</div>
          <div className="ua-sub">
            Bring students, their fee plans and everything already collected across from your previous system.
          </div>
        </div>
        <IconButton onClick={handleClose} disabled={busy}><CloseIcon /></IconButton>
      </div>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ---- Step 1: template ---- */}
        <div className="ua-step">
          <div className="ua-step-num">1</div>
          <div className="ua-step-body">
            <div className="ua-step-title">Get the template</div>
            <div className="ua-step-text">
              Three sheets: fill in <b>Admissions</b>, copy values from <b>Allowed Values</b> (your counsellors&apos;
              emails, courses and centers are listed there), and read <b>Instructions</b> if a column is unclear.
              One row per student.
            </div>
            <Button
              onClick={downloadTemplate}
              startIcon={<FileDownloadIcon />}
              variant="outlined"
              size="small"
              sx={{ textTransform: 'none', mt: 1 }}
            >
              Download template
            </Button>
          </div>
        </div>

        {/* ---- Step 2: files ---- */}
        <div className="ua-step">
          <div className="ua-step-num">2</div>
          <div className="ua-step-body">
            <div className="ua-step-title">Upload your filled-in file</div>
            <div className="ua-file-row">
              <Button
                component="label"
                variant={sheet ? 'outlined' : 'contained'}
                startIcon={<UploadFileIcon />}
                size="small"
                sx={{ textTransform: 'none' }}
                disabled={busy}
              >
                {sheet ? 'Change file' : 'Choose .xlsx file'}
                <input ref={sheetInputRef} type="file" accept=".xlsx" hidden onChange={pickSheet} />
              </Button>
              {sheet && (
                <span className="ua-file-name">
                  <CheckCircleIcon fontSize="small" sx={{ color: '#16a34a' }} />
                  {sheet.name}
                </span>
              )}
            </div>

            <div className="ua-step-title" style={{ marginTop: 14 }}>
              Student photos &amp; payment proofs <span className="ua-optional">optional</span>
            </div>
            <div className="ua-step-text">
              Attach the images your sheet names in <code>photo_file_name</code> and the{' '}
              <code>*_proof_file_name</code> columns. File names are matched ignoring case.
            </div>
            <div className="ua-file-row">
              <Button
                component="label"
                variant="outlined"
                startIcon={<ImageIcon />}
                size="small"
                sx={{ textTransform: 'none' }}
                disabled={busy}
              >
                Attach images
                <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={pickImages} />
              </Button>
              {images.length > 0 && (
                <span className="ua-file-name">
                  {images.length} image{images.length === 1 ? '' : 's'} attached
                  <Button size="small" onClick={() => setImages([])} sx={{ textTransform: 'none', ml: 1 }} disabled={busy}>
                    Clear
                  </Button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ---- Step 3: duplicates ---- */}
        <div className="ua-step">
          <div className="ua-step-num">3</div>
          <div className="ua-step-body">
            <div className="ua-step-title">If a student is already in the CRM</div>
            <FormControl size="small" sx={{ minWidth: 320, mt: 1 }} disabled={busy}>
              <Select value={duplicateHandling} onChange={(e) => setDuplicateHandling(e.target.value)}>
                <MenuItem value="use_existing">Attach the admission to the existing lead (recommended)</MenuItem>
                <MenuItem value="skip">Skip the row</MenuItem>
              </Select>
            </FormControl>
            <div className="ua-step-text" style={{ marginTop: 6 }}>
              A student who already has an admission here is never given a second one, whichever you pick — so
              re-uploading a corrected file is safe.
            </div>
          </div>
        </div>

        {/* ---- Validation result ---- */}
        {pv && !result.committed && (
          <div className="ua-panel">
            <div className="ua-panel-title">Checked {pv.total_rows} row{pv.total_rows === 1 ? '' : 's'}</div>
            <div className="ua-counts">
              <Chip size="small" label={`${pv.valid_rows} ready to import`} sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
              {pv.invalid_rows > 0 && (
                <Chip size="small" label={`${pv.invalid_rows} with problems`} sx={{ bgcolor: '#fee2e2', color: '#991b1b' }} />
              )}
              {pv.duplicate_rows > 0 && (
                <Chip size="small" label={`${pv.duplicate_rows} already in the CRM`} sx={{ bgcolor: '#fef3c7', color: '#92400e' }} />
              )}
            </div>
            {(pv.sample_errors_json || []).length > 0 && (
              <>
                <div className="ua-panel-sub">Rows that need fixing before they will import:</div>
                <ul className="ua-errors">
                  {(pv.sample_errors_json || []).slice(0, 12).map((e, i) => (
                    <li key={i}>
                      <b>Row {e.row_number}</b> · <span className="ua-code">{e.code}</span> — {e.message}
                    </li>
                  ))}
                </ul>
                {pv.invalid_rows > 12 && (
                  <div className="ua-panel-sub">…and {pv.invalid_rows - 12} more. Every one is listed on the Problem rows tab after importing.</div>
                )}
              </>
            )}
            <div className="ua-panel-sub" style={{ marginTop: 10 }}>
              Nothing has been created yet. Rows with problems are skipped — you can fix them in the sheet and
              re-upload at any time.
            </div>
          </div>
        )}

        {/* ---- Progress + done ---- */}
        {result?.committed && (
          <div className="ua-panel">
            <div className="ua-panel-title">
              {progress?.phase === 'completed' ? 'Import finished' : 'Importing…'}
            </div>
            <LinearProgress
              variant={progress?.total ? 'determinate' : 'indeterminate'}
              value={pct}
              sx={{ my: 1.2, height: 8, borderRadius: 4 }}
            />
            <div className="ua-counts">
              <Chip size="small" label={`${progress?.success ?? 0} imported`} sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
              <Chip size="small" label={`${progress?.failed ?? 0} problem rows`} sx={{ bgcolor: '#fee2e2', color: '#991b1b' }} />
              <Chip size="small" label={`${progress?.duplicates ?? 0} matched existing`} sx={{ bgcolor: '#fef3c7', color: '#92400e' }} />
            </div>
            {progress?.phase === 'completed' && (progress?.failed ?? 0) > 0 && (
              <div className="ua-panel-sub" style={{ marginTop: 8 }}>
                Open the <b>Problem rows</b> tab to see exactly which rows didn&apos;t import and why.
              </div>
            )}
          </div>
        )}

        {busy && (
          <div className="ua-busy">
            <CircularProgress size={16} />
            <span>{busyLabel || 'Working…'}</span>
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={busy} sx={{ textTransform: 'none' }}>
          {result?.committed ? 'Done' : 'Cancel'}
        </Button>
        {!result?.committed && !pv && (
          <Button
            variant="contained"
            onClick={runImport}
            disabled={busy || !sheet}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            Check the file
          </Button>
        )}
        {pv && !result.committed && (
          <Button
            variant="contained"
            onClick={commitImport}
            disabled={busy || !pv.valid_rows}
            sx={{ textTransform: 'none', bgcolor: 'var(--primary)' }}
          >
            Import {pv.valid_rows} student{pv.valid_rows === 1 ? '' : 's'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UploadAdmissions;
