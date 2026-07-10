// Student set-password / reset landing — opened from the invite or reset link
// (/student/set-password?token=…&t=<tenantSlug>). Sets the password, logs the
// student in, and sends them to their home.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';

export default function StudentSetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const slug = params.get('t') || studentAuth.getTenantSlug() || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token || !slug) { setError('This link is invalid. Ask the accounts team to resend it.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const res = await studentApi.setPassword(slug, { token, password });
      const data = res?.data ?? res;
      studentAuth.setSession({ access_token: data.access_token, student: data.student, tenantSlug: slug });
      navigate('/student/home', { replace: true });
    } catch (err) {
      setError(err?.message || 'This link is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <form onSubmit={submit} style={card}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Set your password</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Choose a password to access your student portal.</div>

        {error && <div style={alertErr}>{error}</div>}

        <label style={lbl}>New password</label>
        <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <label style={lbl}>Confirm password</label>
        <input style={inp} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Saving…' : 'Set password & sign in'}
        </button>
      </form>
    </div>
  );
}

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 16 };
const card = { background: '#fff', padding: 32, borderRadius: 14, border: '1px solid #e2e8f0', width: '100%', maxWidth: 380, boxShadow: '0 24px 60px -30px rgba(15,23,42,0.35)', display: 'flex', flexDirection: 'column' };
const lbl = { fontSize: 12, fontWeight: 600, color: '#475569', margin: '10px 0 4px' };
const inp = { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' };
const btn = { marginTop: 20, padding: '11px 16px', borderRadius: 8, border: 'none', background: '#E53935', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const alertErr = { background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 };
