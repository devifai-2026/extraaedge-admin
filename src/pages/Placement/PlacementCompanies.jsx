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

function BulkDialog({ onClose, onDone, onError }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    // One company per line: Name, Website, Industry, Location
    const rows = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, website, industry, location] = l.split(',').map((x) => (x || '').trim());
      return { name, website: website || null, industry: industry || null, location: location || null };
    }).filter((r) => r.name);
    if (!rows.length) { onError('Add at least one company (one per line)'); return; }
    setBusy(true);
    try { const r = await placementApi.bulkCompanies(rows); const d = r?.data ?? r; onDone(d.inserted); } catch (e) { onError(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk import companies</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 8 }}>One company per line: <code>Name, Website, Industry, Location</code></div>
        <TextField fullWidth multiline minRows={8} placeholder={'Acme Corp, https://acme.com, SaaS, Bengaluru\nGlobex, https://globex.io, Fintech, Pune'} value={text} onChange={(e) => setText(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', bgcolor: '#E53935' }}>Import</Button>
      </DialogActions>
    </Dialog>
  );
}
