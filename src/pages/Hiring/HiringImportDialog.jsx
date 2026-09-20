// Bulk import for the hiring sheets — candidates or interviews.
//
// Preview then commit, never one step: the recruiter sees which rows are bad
// and why, and how many are updates rather than new people, BEFORE anything is
// written. Mirrors the lead importer's flow, which they already know, but maps
// entirely different columns onto entirely different tables.
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  Alert, CircularProgress, TextField, MenuItem, Chip, Table, TableHead,
  TableRow, TableCell, TableBody,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import { hiringApi } from '../../lib/endpoints';
import { parseCsv, mapRows, unmappedHeaders } from './csv';

const HiringImportDialog = ({ open, kind = 'candidate', positions = [], onClose, onDone }) => {
  const [rows, setRows] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [positionId, setPositionId] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const isInterview = kind === 'interview';
  const label = isInterview ? 'interviews' : 'candidates';

  const reset = () => {
    setRows([]); setUnmapped([]); setPositionId(''); setPreview(null); setErr('');
  };
  const close = () => { reset(); onClose?.(); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setPreview(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const mapped = mapRows(parsed.rows, kind);
      if (!mapped.length) { setErr('No data rows found in that file.'); return; }
      setRows(mapped);
      setUnmapped(unmappedHeaders(parsed.headers, kind));
    } catch {
      setErr('Could not read that file. Save the sheet as CSV and try again.');
    }
  };

  const runPreview = async () => {
    setBusy(true); setErr('');
    try {
      const body = { rows, ...(positionId ? { position_id: positionId } : {}) };
      const r = isInterview
        ? await hiringApi.previewInterviewImport(body)
        : await hiringApi.previewCandidateImport(body);
      setPreview(r?.data || null);
    } catch (e) { setErr(e?.message || 'Preview failed'); } finally { setBusy(false); }
  };

  const commit = async () => {
    setBusy(true); setErr('');
    try {
      const body = { rows, ...(positionId ? { position_id: positionId } : {}) };
      const r = isInterview
        ? await hiringApi.commitInterviewImport(body)
        : await hiringApi.commitCandidateImport(body);
      const d = r?.data || {};
      const msg = isInterview
        ? `Imported ${d.created} interview${d.created === 1 ? '' : 's'}`
          + (d.candidates_created ? ` (${d.candidates_created} new candidate${d.candidates_created === 1 ? '' : 's'})` : '')
        : `Imported ${d.created} new, updated ${d.updated}`;
      reset();
      onDone?.(msg);
    } catch (e) { setErr(e?.message || 'Import failed'); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: 17 }}>
        <UploadFileIcon sx={{ color: '#E87B2F' }} />
        Bulk upload {label}
      </DialogTitle>

      <DialogContent dividers>
        <Typography sx={{ fontSize: 13.5, color: '#64748b', mb: 2 }}>
          Save the sheet as CSV and upload it. Column names are matched loosely, so
          the existing headers work as they are.
        </Typography>

        <Button component="label" variant="outlined" sx={{ textTransform: 'none' }}>
          Choose CSV file
          <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
        </Button>

        {rows.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Chip size="small" label={`${rows.length} rows read`} sx={{ mr: 1 }} />
            {unmapped.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: 13 }}>
                These columns were not recognised and will be ignored:{' '}
                <strong>{unmapped.join(', ')}</strong>
              </Alert>
            )}

            {/* A sheet that names its position per row does not need this;
                it is the fallback for a sheet that assumes one vacancy. */}
            <TextField
              select size="small" fullWidth sx={{ mt: 2 }}
              label="Position (used when a row does not name one)"
              value={positionId} onChange={(e) => setPositionId(e.target.value)}
            >
              <MenuItem value="">— use each row&apos;s own Position column —</MenuItem>
              {positions.map((p) => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {preview && (
          <Box sx={{ mt: 2.5 }}>
            <Alert severity={preview.valid ? 'info' : 'error'} sx={{ fontSize: 13 }}>
              <strong>{preview.valid}</strong> row{preview.valid === 1 ? '' : 's'} ready
              {!isInterview && preview.valid > 0 && (
                <> — {preview.new_rows} new, {preview.updates} will update an existing candidate</>
              )}
              {preview.failed?.length > 0 && <> · <strong>{preview.failed.length}</strong> cannot be imported</>}
            </Alert>

            {preview.unknown_statuses?.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1.5, fontSize: 13 }}>
                These statuses are not configured and will be left blank:{' '}
                <strong>{preview.unknown_statuses.join(', ')}</strong>.
                Add them under Configuration → Hiring statuses first if you need them.
              </Alert>
            )}

            {preview.failed?.length > 0 && (
              <Box sx={{ mt: 1.5, maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Why it was skipped</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.failed.map((f) => (
                      <TableRow key={f.row}>
                        <TableCell sx={{ fontSize: 12.5 }}>{f.row}</TableCell>
                        <TableCell sx={{ fontSize: 12.5, color: '#b91c1c' }}>{f.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          onClick={runPreview} disabled={!rows.length || busy}
          variant="outlined" sx={{ textTransform: 'none' }}
        >
          {busy && !preview ? <CircularProgress size={18} /> : 'Check file'}
        </Button>
        <Button
          onClick={commit} disabled={!preview || !preview.valid || busy}
          variant="contained" sx={{ textTransform: 'none', bgcolor: '#E87B2F' }}
        >
          {busy && preview ? 'Importing…' : `Import ${preview?.valid ?? 0}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HiringImportDialog;
