// Bulk import for the hiring sheets — candidates or interviews.
//
// Upload → (pick a sheet, if the workbook has several) → queue → close.
// The import runs in the BACKGROUND: a real recruitment workbook is hundreds
// of rows, and the recruiter should not be held on a spinner. Progress and the
// failed/duplicate breakdown live on the Imports tab, which this links to.
//
// .xlsx and .csv both work. For .xlsx the tabs are listed first, because the
// sheets people actually keep have one tab per month rather than one sheet.
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Alert, CircularProgress, TextField, MenuItem, Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import { hiringApi, uploadsApi } from '../../lib/endpoints';

const MAX_BYTES = 15 * 1024 * 1024;

const HiringImportDialog = ({ open, kind = 'candidate', positions = [], onClose, onDone }) => {
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState('');
  const [positionId, setPositionId] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const isInterview = kind === 'interview';
  const label = isInterview ? 'interviews' : 'candidates';

  const reset = () => {
    setFile(null); setFileKey(''); setSheets([]); setSheet('');
    setPositionId(''); setBusy(''); setErr('');
  };
  const close = () => { reset(); onClose?.(); };

  // Upload first, then ask the server what tabs the workbook has. The file
  // never travels through the API itself — the JSON body limit is 200kb.
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(''); setSheets([]); setSheet(''); setFileKey('');
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      setErr('Upload a .xlsx or .csv file.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setErr(`That file is ${(f.size / (1024 * 1024)).toFixed(1)} MB; the limit is 15 MB.`);
      return;
    }
    setFile(f);
    setBusy('Uploading…');
    try {
      const pres = (await uploadsApi.presign({
        purpose: 'csv_import',
        content_type: f.type || 'application/octet-stream',
        size_bytes: f.size,
        filename: f.name,
      }))?.data;
      if (!pres?.upload_url || !pres?.r2_key) throw new Error('Could not start the upload.');
      // The signed URL bakes in the content type, so the PUT must send the
      // same header or storage rejects it as a signature mismatch.
      const put = await fetch(pres.upload_url, {
        method: 'PUT', headers: pres.headers || {}, body: f,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setFileKey(pres.r2_key);

      if (/\.xlsx$/i.test(f.name)) {
        setBusy('Reading sheets…');
        const s = (await hiringApi.workbookSheets({ file_key: pres.r2_key }))?.data?.sheets || [];
        setSheets(s);
        if (s.length === 1) setSheet(s[0].name);
      }
    } catch (e2) {
      setErr(e2?.message || 'Upload failed');
      setFile(null);
    } finally { setBusy(''); }
  };

  const start = async () => {
    setErr(''); setBusy('Starting…');
    try {
      await hiringApi.queueImport({
        kind,
        file_key: fileKey,
        file_name: file?.name,
        ...(sheet ? { sheet_name: sheet } : {}),
        ...(positionId ? { position_id: positionId } : {}),
      });
      reset();
      onDone?.(`Import started — track it on the Imports tab.`);
    } catch (e) {
      setErr(e?.message || 'Could not start the import');
    } finally { setBusy(''); }
  };

  // An .xlsx with several tabs must have one chosen before we can start.
  const needsSheet = sheets.length > 1 && !sheet;
  const canStart = Boolean(fileKey) && !needsSheet && !busy;

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: 17 }}>
        <UploadFileIcon sx={{ color: '#E87B2F' }} />
        Bulk upload {label}
      </DialogTitle>

      <DialogContent dividers>
        <Typography sx={{ fontSize: 13.5, color: '#64748b', mb: 2 }}>
          Upload the sheet as it is — .xlsx or .csv. Column names are matched
          loosely, so the existing headers work without renaming anything.
        </Typography>

        <Button component="label" variant="outlined" disabled={!!busy} sx={{ textTransform: 'none' }}>
          {file ? 'Choose a different file' : 'Choose file'}
          <input type="file" accept=".csv,.xlsx" hidden onChange={onFile} />
        </Button>

        {busy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={16} />
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>{busy}</Typography>
          </Box>
        )}

        {file && fileKey && !busy && (
          <Box sx={{ mt: 2 }}>
            <Chip size="small" label={file.name} />
          </Box>
        )}

        {sheets.length > 1 && (
          <TextField
            select size="small" fullWidth sx={{ mt: 2 }}
            label="Which sheet?"
            value={sheet} onChange={(e) => setSheet(e.target.value)}
            helperText="This workbook has several tabs — pick the one to import."
          >
            {sheets.map((s) => (
              <MenuItem key={s.name} value={s.name}>
                {s.name} {s.approx_rows ? `· ~${s.approx_rows} rows` : ''}
              </MenuItem>
            ))}
          </TextField>
        )}

        {fileKey && (
          <TextField
            select size="small" fullWidth sx={{ mt: 2 }}
            label="Position (used when a row does not name one)"
            value={positionId} onChange={(e) => setPositionId(e.target.value)}
          >
            <MenuItem value="">— use each row&apos;s own Position column —</MenuItem>
            {positions.map((p) => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
          </TextField>
        )}

        {fileKey && !busy && (
          <Alert severity="info" sx={{ mt: 2, fontSize: 13 }}>
            The import runs in the background, so you can carry on working.
            Rejected and duplicate rows are listed on the Imports tab when it finishes.
          </Alert>
        )}

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          onClick={start} disabled={!canStart}
          variant="contained" sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
        >
          Start import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HiringImportDialog;
