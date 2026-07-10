// Read-only student profile viewer for trainers/admins (photo, contact, links,
// skills/bio, CV download). Backend scopes access to the student's course
// trainers. Open with a studentId.
import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Alert, Chip } from '@mui/material';
import { studentProfileApi } from '../../lib/endpoints';

export default function StudentProfileDialog({ studentId, onClose }) {
  const [p, setP] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!studentId) return;
    studentProfileApi.view(studentId).then((r) => setP(r?.data ?? r)).catch((e) => setErr(e?.message || 'Could not load profile'));
  }, [studentId]);

  return (
    <Dialog open={!!studentId} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Student profile</DialogTitle>
      <DialogContent>
        {err && <Alert severity="error">{err}</Alert>}
        {!err && !p && <div style={{ textAlign: 'center', padding: 24 }}><CircularProgress size={22} /></div>}
        {p && (
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24, fontWeight: 800, color: '#cbd5e1' }}>{(p.name || '?').slice(0, 1)}</span>}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{p.email}{p.phone ? ` · ${p.phone}` : ''}</div>
                {p.cv_url && <a href={p.cv_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 13, color: '#2563eb' }}>📄 Download CV{p.cv_filename ? ` (${p.cv_filename})` : ''}</a>}
              </div>
            </div>

            {p.bio && <Row label="Bio" value={p.bio} />}
            {p.skills && <Row label="Skills" value={<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.skills.split(',').map((sk, i) => sk.trim() && <Chip key={i} size="small" label={sk.trim()} />)}</div>} />}
            {p.address && <Row label="Address" value={p.address} />}
            {(p.github_url || p.linkedin_url || p.portfolio_url) && (
              <Row label="Links" value={
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer">GitHub</a>}
                  {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                  {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>}
                </div>
              } />
            )}
            {!p.bio && !p.skills && !p.cv_url && !p.github_url && <div style={{ fontSize: 13, color: '#94a3b8' }}>This student hasn’t filled in their profile yet.</div>}
          </div>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}

const Row = ({ label, value }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
    <div style={{ fontSize: 14, color: '#334155', marginTop: 2 }}>{value}</div>
  </div>
);
