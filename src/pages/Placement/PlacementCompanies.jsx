// Placement Companies — hiring-partner directory: add a company (with optional
// logo), bulk-import via CSV/paste, edit/delete.
import { useEffect, useState, useRef } from 'react';
import { Box, MenuItem, TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import { placementApi, uploadsApi } from '../../lib/endpoints';
import { PageHeader, Card, EmptyState, Btn, Skeleton } from '../../lib/lmsUi';

function putFile(url, method, headers, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

export default function PlacementCompanies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => { setLoading(true); placementApi.listCompanies().then((r) => setRows(r?.data || [])).catch((e) => setToast({ severity: 'error', text: e.message })).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const remove = async (c) => { if (!window.confirm(`Delete ${c.name}?`)) return; try { await placementApi.deleteCompany(c.id); load(); } catch (e) { setToast({ severity: 'error', text: e.message }); } };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader title="Companies" subtitle="Your hiring-partner directory." icon={BusinessIcon}
        right={(
          <>
            <Button variant="outlined" onClick={() => setBulkOpen(true)} sx={{ textTransform: 'none' }}>Bulk import</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Add company</Button>
          </>
        )}
      />
      {loading ? <Card><Skeleton h={16} w="40%" /><div style={{ height: 8 }} /><Skeleton h={12} w="70%" /></Card>
        : rows.length === 0 ? <Card><EmptyState icon="🏢" title="No companies yet" text="Add your first hiring partner, or bulk-import a list." /></Card> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {rows.map((c) => (
              <Card key={c.id} pad={16}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontWeight: 800, color: '#94a3b8' }}>
                    {c.logo_url ? <img src={c.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (c.name || '?').slice(0, 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.industry || '—'}{c.location ? ` · ${c.location}` : ''}</div>
                  </div>
                  <IconButton size="small" onClick={() => remove(c)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 8 }}>{c.opening_count || 0} opening{c.opening_count === 1 ? '' : 's'}{c.website ? <> · <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>site ↗</a></> : ''}</div>
              </Card>
            ))}
          </div>
        )}

      {addOpen && <AddCompanyDialog onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); setToast({ severity: 'success', text: 'Company added' }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      {bulkOpen && <BulkDialog onClose={() => setBulkOpen(false)} onDone={(n) => { setBulkOpen(false); load(); setToast({ severity: 'success', text: `Imported ${n} companies` }); }} onError={(m) => setToast({ severity: 'error', text: m })} />}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.text}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function AddCompanyDialog({ onClose, onDone, onError }) {
  const [f, setF] = useState({ name: '', website: '', industry: '', location: '', about: '', logo_r2_key: null });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pickLogo = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true);
    try {
      const pre = await uploadsApi.presign({ purpose: 'company_logo', content_type: file.type || 'image/png', size_bytes: file.size, filename: file.name });
      const d = pre?.data ?? pre;
      await putFile(d.upload_url, d.method || 'PUT', d.headers || { 'Content-Type': file.type }, file);
      await uploadsApi.confirm({ purpose: 'company_logo', r2_key: d.r2_key, visibility: 'private' });
      setF((s) => ({ ...s, logo_r2_key: d.r2_key }));
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!f.name.trim()) { onError('Name required'); return; }
    setBusy(true);
    try { await placementApi.createCompany({ ...f, name: f.name.trim() }); onDone(); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add company</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
        <TextField size="small" label="Company name" value={f.name} onChange={set('name')} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" label="Industry" value={f.industry} onChange={set('industry')} sx={{ flex: 1 }} />
          <TextField size="small" label="Location" value={f.location} onChange={set('location')} sx={{ flex: 1 }} />
        </Box>
        <TextField size="small" label="Website" value={f.website} onChange={set('website')} placeholder="https://…" />
        <TextField size="small" label="About" multiline minRows={2} value={f.about} onChange={set('about')} />
        <Box>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
          <Button size="small" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} disabled={busy} sx={{ textTransform: 'none' }}>{f.logo_r2_key ? 'Logo added ✓' : 'Upload logo'}</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>{busy ? <CircularProgress size={18} /> : 'Add'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// Header-aware, quoted-comma-safe CSV parser (handles "a, b" and "" escapes).
const parseCsv = (text) => {
  const rows = [];
  let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
};

const TEMPLATE = 'name,website,industry,location\nAcme Corp,https://acme.com,SaaS,Bengaluru\nGlobex,https://globex.io,Fintech,Pune\n';

function BulkDialog({ onClose, onDone, onError }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'companies-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(f);
  };

  // Parse to rows, tolerating an optional header row.
  const toRows = () => {
    const parsed = parseCsv(text);
    if (!parsed.length) return [];
    const first = parsed[0].map((c) => c.trim().toLowerCase());
    const hasHeader = first.includes('name');
    const idx = hasHeader
      ? { name: first.indexOf('name'), website: first.indexOf('website'), industry: first.indexOf('industry'), location: first.indexOf('location') }
      : { name: 0, website: 1, industry: 2, location: 3 };
    return parsed.slice(hasHeader ? 1 : 0)
      .map((r) => ({
        name: (r[idx.name] || '').trim(),
        website: (r[idx.website] || '').trim() || null,
        industry: (r[idx.industry] || '').trim() || null,
        location: (r[idx.location] || '').trim() || null,
      }))
      .filter((x) => x.name);
  };
  const preview = toRows();

  const submit = async () => {
    const rows = toRows();
    if (!rows.length) { onError('No valid companies found (need at least a name).'); return; }
    setBusy(true);
    try { const r = await placementApi.bulkCompanies(rows); const d = r?.data ?? r; onDone(d.inserted); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk import companies</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={downloadTemplate} sx={{ textTransform: 'none' }}>Download CSV template</Button>
          <Button size="small" variant="outlined" component="label" sx={{ textTransform: 'none' }}>
            Upload CSV<input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </Button>
        </div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 8 }}>Columns: <code>name, website, industry, location</code> (a header row is optional; commas inside quotes are handled).</div>
        <TextField fullWidth multiline minRows={8} placeholder={TEMPLATE} value={text} onChange={(e) => setText(e.target.value)} />
        {text.trim() && <div style={{ fontSize: 12.5, color: preview.length ? '#15803d' : '#dc2626', marginTop: 6 }}>{preview.length} valid {preview.length === 1 ? 'company' : 'companies'} detected.</div>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || !preview.length} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Import {preview.length || ''}</Button>
      </DialogActions>
    </Dialog>
  );
}
