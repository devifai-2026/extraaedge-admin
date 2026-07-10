// Student portal login — email + password, scoped to a tenant (slug). A
// separate session from staff (studentApi / ee_student_* storage). Lands on
// /student/home on success.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState(studentAuth.getTenantSlug() || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResetMsg('');
    const slug = tenantSlug.trim();
    if (!slug) { setError('Enter your institute code.'); return; }
    setBusy(true);
    try {
      const res = await studentApi.login(slug, { email: email.trim(), password });
      const data = res?.data ?? res;
      studentAuth.setSession({ access_token: data.access_token, student: data.student, tenantSlug: slug });
      navigate('/student/home', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(''); setResetMsg('');
    const slug = tenantSlug.trim();
    if (!slug || !email.trim()) { setError('Enter your institute code and email first.'); return; }
    try {
      await studentApi.requestReset(slug, { email: email.trim() });
      setResetMsg('If that email is registered, a reset link has been sent.');
    } catch {
      setResetMsg('If that email is registered, a reset link has been sent.');
    }
  };

  return (
    <div style={wrap}>
      <form onSubmit={submit} style={card}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Student Portal</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Sign in to access your course.</div>

        {error && <div style={alertErr}>{error}</div>}
        {resetMsg && <div style={alertOk}>{resetMsg}</div>}

        <label style={lbl}>Institute code</label>
        <input style={inp} value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="e.g. demo" autoCapitalize="none" />

        <label style={lbl}>Email</label>
        <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="username" />

        <label style={lbl}>Password</label>
        <input style={inp} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" onClick={forgot} style={linkBtn}>Forgot password?</button>
      </form>
    </div>
  );
}

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 16 };
const card = { background: '#fff', padding: 32, borderRadius: 14, border: '1px solid #e2e8f0', width: '100%', maxWidth: 380, boxShadow: '0 24px 60px -30px rgba(15,23,42,0.35)', display: 'flex', flexDirection: 'column' };
const lbl = { fontSize: 12, fontWeight: 600, color: '#475569', margin: '10px 0 4px' };
const inp = { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' };
const btn = { marginTop: 20, padding: '11px 16px', borderRadius: 8, border: 'none', background: '#E53935', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const linkBtn = { marginTop: 10, background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer' };
const alertErr = { background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 };
const alertOk = { background: '#f0fdf4', color: '#15803d', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 };
