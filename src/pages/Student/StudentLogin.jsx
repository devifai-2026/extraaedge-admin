// Student portal login — premium, tenant-branded, mobile-first. Email + password
// scoped to a tenant (institute code / slug). Separate session from staff
// (studentApi / ee_student_* storage). Lands on /student/home on success.
//
// The left brand panel adopts the institute's logo + brand colour once the code
// is entered (public /student-auth/branding lookup, debounced); falls back to a
// tasteful default identity when unbranded. On mobile the panel collapses to a
// slim branded header above the form.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, studentAuth } from '../../lib/studentApi';
import { resolveAssetUrl } from '../../lib/config';
import { isEmail } from '../../lib/validators';

const DEFAULT_PRIMARY = '#E53935';
const DEFAULT_SECONDARY = '#0f172a';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState(studentAuth.getTenantSlug() || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [touchedEmail, setTouchedEmail] = useState(false);
  // Branding seeded from any cached prior session, refined via the public lookup.
  const [brand, setBrand] = useState(() => studentAuth.getTenant());
  const brandReq = useRef(0);

  // Debounced branding lookup as the student types their institute code.
  useEffect(() => {
    const slug = tenantSlug.trim();
    if (!slug) { return undefined; }
    const seq = ++brandReq.current;
    const t = setTimeout(() => {
      studentApi.branding(slug)
        .then((r) => { if (seq === brandReq.current) { const d = r?.data ?? r; if (d?.slug) setBrand(d); } })
        .catch(() => { /* unknown code → keep default identity, no error shown pre-submit */ });
    }, 450);
    return () => clearTimeout(t);
  }, [tenantSlug]);

  const primary = brand?.brand_primary_color || DEFAULT_PRIMARY;
  const secondary = brand?.brand_secondary_color || DEFAULT_SECONDARY;
  const instituteName = brand?.name || 'Student Portal';
  const logo = useMemo(() => resolveAssetUrl(brand?.logo_url || null), [brand]);
  const emailBad = touchedEmail && !!email && !isEmail(email);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResetMsg('');
    const slug = tenantSlug.trim();
    if (!slug) { setError('Enter your institute code.'); return; }
    if (!isEmail(email)) { setTouchedEmail(true); setError('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      const res = await studentApi.login(slug, { email: email.trim(), password });
      const data = res?.data ?? res;
      studentAuth.setSession({ access_token: data.access_token, student: data.student, tenantSlug: slug });
      if (brand?.slug) studentAuth.setTenant(brand);
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
    try { await studentApi.requestReset(slug, { email: email.trim() }); }
    catch { /* fall through to the same neutral message */ }
    setResetMsg('If that email is registered, a reset link has been sent.');
  };

  return (
    <div className="stu-login-root">
      <style>{CSS}</style>
      {/* Brand panel */}
      <div className="stu-brand" style={{ background: `linear-gradient(155deg, ${primary} 0%, ${secondary} 115%)` }}>
        <div className="stu-brand-inner">
          <div className="stu-logo-wrap">
            {logo
              ? <img src={logo} alt={instituteName} className="stu-logo" />
              : <div className="stu-logo-fallback">{instituteName.slice(0, 2).toUpperCase()}</div>}
          </div>
          <h1 className="stu-brand-name">{instituteName}</h1>
          <p className="stu-brand-tag">Your classes, attendance, tests, projects, placements and certificate — all in one place.</p>
          <ul className="stu-brand-points">
            <li>Live classes &amp; attendance</li>
            <li>Tests, projects &amp; leaderboard</li>
            <li>Fees, receipts &amp; certificate</li>
          </ul>
        </div>
        <div className="stu-brand-foot">Powered by ExtraaEdge</div>
      </div>

      {/* Form panel */}
      <div className="stu-form-panel">
        <form onSubmit={submit} className="stu-card" style={{ '--primary': primary }}>
          <div className="stu-mobile-brand">
            {logo ? <img src={logo} alt={instituteName} className="stu-mobile-logo" /> : null}
            <span>{instituteName}</span>
          </div>
          <h2 className="stu-title">Welcome back</h2>
          <p className="stu-sub">Sign in to access your course.</p>

          {error ? <div className="stu-alert stu-alert-err">{error}</div> : null}
          {resetMsg ? <div className="stu-alert stu-alert-ok">{resetMsg}</div> : null}

          <label className="stu-lbl" htmlFor="stu-slug">Institute code</label>
          <input id="stu-slug" className="stu-inp" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="e.g. demo" autoCapitalize="none" autoCorrect="off" />

          <label className="stu-lbl" htmlFor="stu-email">Email</label>
          <input id="stu-email" className={`stu-inp ${emailBad ? 'stu-inp-err' : ''}`} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouchedEmail(true)}
            placeholder="you@example.com" autoComplete="username" />
          {emailBad ? <div className="stu-field-err">Enter a valid email address</div> : null}

          <label className="stu-lbl" htmlFor="stu-pw">Password</label>
          <div className="stu-pw-wrap">
            <input id="stu-pw" className="stu-inp" type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" className="stu-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit" disabled={busy} className="stu-btn">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={forgot} className="stu-link">Forgot password?</button>
        </form>
      </div>
    </div>
  );
}

const CSS = `
.stu-login-root { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f1f5f9; }
.stu-brand { position: relative; color: #fff; padding: 48px 44px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.stu-brand::after { content: ''; position: absolute; inset: 0; background: radial-gradient(1200px 500px at 80% -10%, rgba(255,255,255,.16), transparent 60%); pointer-events: none; }
.stu-brand-inner { position: relative; margin-top: 8vh; max-width: 440px; }
.stu-logo-wrap { margin-bottom: 26px; }
.stu-logo { max-height: 60px; max-width: 220px; object-fit: contain; filter: drop-shadow(0 6px 16px rgba(0,0,0,.25)); background: #fff; padding: 10px 14px; border-radius: 12px; }
.stu-logo-fallback { width: 64px; height: 64px; border-radius: 16px; background: rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; letter-spacing: .5px; }
.stu-brand-name { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 12px; text-wrap: balance; }
.stu-brand-tag { font-size: 15px; line-height: 1.55; opacity: .92; margin: 0 0 26px; max-width: 40ch; }
.stu-brand-points { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.stu-brand-points li { position: relative; padding-left: 26px; font-size: 14.5px; opacity: .95; }
.stu-brand-points li::before { content: '✓'; position: absolute; left: 0; top: -1px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,.2); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
.stu-brand-foot { position: relative; font-size: 12px; opacity: .7; }

.stu-form-panel { display: flex; align-items: center; justify-content: center; padding: 32px; }
.stu-card { background: #fff; padding: 40px; border-radius: 18px; border: 1px solid #e6e9ef; width: 100%; max-width: 400px; box-shadow: 0 30px 70px -40px rgba(15,23,42,.4); display: flex; flex-direction: column; }
.stu-mobile-brand { display: none; align-items: center; gap: 10px; font-weight: 800; color: #0f172a; margin-bottom: 18px; font-size: 18px; }
.stu-mobile-logo { max-height: 34px; max-width: 120px; object-fit: contain; }
.stu-title { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; margin: 0 0 4px; }
.stu-sub { font-size: 13.5px; color: #64748b; margin: 0 0 22px; }
.stu-alert { padding: 9px 12px; border-radius: 9px; font-size: 13px; margin-bottom: 14px; }
.stu-alert-err { background: #fef2f2; color: #b91c1c; }
.stu-alert-ok { background: #f0fdf4; color: #15803d; }
.stu-lbl { font-size: 12px; font-weight: 700; color: #475569; margin: 12px 0 5px; letter-spacing: .02em; }
.stu-inp { padding: 11px 13px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; width: 100%; box-sizing: border-box; }
.stu-inp:focus { border-color: var(--primary, #E53935); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #E53935) 18%, transparent); }
.stu-inp-err { border-color: #dc2626; }
.stu-field-err { color: #dc2626; font-size: 12px; margin-top: 5px; }
.stu-pw-wrap { position: relative; display: flex; align-items: center; }
.stu-pw-toggle { position: absolute; right: 8px; background: none; border: none; color: #64748b; font-size: 12.5px; font-weight: 700; cursor: pointer; padding: 6px; }
.stu-btn { margin-top: 22px; padding: 12px 16px; border-radius: 10px; border: none; background: var(--primary, #E53935); color: #fff; font-size: 14.5px; font-weight: 700; cursor: pointer; transition: filter .15s, transform .05s; }
.stu-btn:hover:not(:disabled) { filter: brightness(1.05); }
.stu-btn:active:not(:disabled) { transform: translateY(1px); }
.stu-btn:disabled { opacity: .65; cursor: default; }
.stu-link { margin-top: 12px; background: none; border: none; color: #2563eb; font-size: 13px; cursor: pointer; align-self: center; }

@media (max-width: 860px) {
  .stu-login-root { grid-template-columns: 1fr; }
  .stu-brand { display: none; }
  .stu-mobile-brand { display: flex; }
  .stu-form-panel { padding: 20px; min-height: 100vh; }
  .stu-card { box-shadow: 0 12px 40px -28px rgba(15,23,42,.4); padding: 28px 22px; }
}
`;
