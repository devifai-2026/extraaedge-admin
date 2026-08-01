import './Login.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors } from '../../theme/colors'
import { api, auth } from '../../lib/api'
import { applyThemeFromUser } from '../../theme/applyTheme'
import { firstAllowedRoute } from '../../lib/rbac'

function Login() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [email, setEmail] = useState('admin@demo.local')
  const [password, setPassword] = useState('ChangeMe123!')
  const [tenantSlug, setTenantSlug] = useState('demo')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Passwordless sign-in state. `passwordUi` is answered by the server per
  // tenant (only the demo tenant keeps a password box); until it replies we
  // show neither credential field, so the password box never flashes for an
  // OTP-only institute.
  const [passwordUi, setPasswordUi] = useState(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(4)
  const [stage, setStage] = useState('credentials')   // credentials | otp
  const [needsPhone, setNeedsPhone] = useState(false) // account has no number yet
  const [sentTo, setSentTo] = useState(null)
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') === 'idle') {
      return 'You were logged out due to 15 minutes of inactivity.'
    }
    return ''
  })
  const navigate = useNavigate()

  const slides = [
    { title: 'Qualify', description: 'Identify the potential hot prospects from massive data using automated workflows.' },
    { title: 'Communicate', description: 'Easy follow-ups with leads through marketing automation across all communication channels.' },
    { title: 'Analyse', description: 'Analyse data, view dashboards and improve conversions by tracking what matters the most.' },
  ]

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  // Ask the server which sign-in form this institute uses. Debounced because
  // it runs while the slug is being typed. An unknown/suspended slug leaves
  // passwordUi false, i.e. the OTP form — the request will report the real
  // problem when it's submitted.
  useEffect(() => {
    const slug = tenantSlug.trim()
    if (!slug) { setPasswordUi(null); return undefined }
    let alive = true
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/login-methods?tenant_slug=${encodeURIComponent(slug)}`)
        if (alive) setPasswordUi(Boolean((res?.data ?? res)?.password_ui))
      } catch {
        if (alive) setPasswordUi(false)
      }
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [tenantSlug])

  // Resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  // Changing who is signing in invalidates a code already sent.
  useEffect(() => {
    setStage('credentials'); setOtp(''); setSentTo(null); setNeedsPhone(false)
  }, [email, tenantSlug])

  const QualifyIcon = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="35" x2="70" y2="35" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="45" x2="70" y2="45" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="55" x2="50" y2="55" stroke={colors.white} strokeWidth="2" />
      <circle cx="60" cy="50" r="8" fill={colors.primary} />
    </svg>
  )

  // Land the session exactly the same way regardless of which path produced
  // it (password or OTP).
  const startSession = (payload) => {
    const sessionUser = payload.user || payload.platform_user
    auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      user: sessionUser,
      tenant: payload.tenant,
      allowed_tabs: payload.allowed_tabs,
    })
    // Repaint to the user's saved theme as soon as they log in. Without
    // this the dashboard would briefly render in whoever-was-here-last's
    // colors before the next reload.
    applyThemeFromUser(sessionUser)
    // Land on the first tab THIS user can actually access. Hardcoding
    // /dashboard breaks for any user whose custom role hides dashboard.
    navigate(firstAllowedRoute())
  }

  // Password sign-in. Still the path for the demo tenant (and for everyone
  // until OTP_LOGIN_ENFORCED is switched on server-side); the backend rejects
  // it for OTP-only tenants, so a stale cached build can't bypass the rule.
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        ...(tenantSlug.trim() ? { tenant_slug: tenantSlug.trim() } : {}),
      })
      startSession(res?.data ?? res)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1 — email + phone must both belong to the same account in this
  // tenant before anything is sent. An account with no number on file comes
  // back as needs_phone, and we ask for one to bind.
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/otp/request', {
        tenant_slug: tenantSlug.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      const data = res?.data ?? res
      if (data?.needs_phone) {
        setNeedsPhone(true)
        setError('')
        return
      }
      setSentTo(data?.phone_masked || null)
      setOtpLength(data?.otp_length || 4)
      setStage('otp')
      setResendIn(30)
    } catch (err) {
      setError(err.message || 'Could not send the OTP')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2 — exchange the code for a session.
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/otp/verify', {
        tenant_slug: tenantSlug.trim(),
        email: email.trim(),
        otp: otp.trim(),
      })
      startSession(res?.data ?? res)
    } catch (err) {
      setError(err.message || 'Incorrect code')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-container" style={{ backgroundColor: colors.bgDark }}>
      <div className="login-left">
        <div className="qualify-content">
          <div className="qualify-icon"><QualifyIcon /></div>
          <h2 style={{ color: colors.white }}>{slides[currentSlide].title}</h2>
          <p style={{ color: colors.textMuted }}>{slides[currentSlide].description}</p>
          <div className="carousel-dots">
            {slides.map((_, index) => (
              <span
                key={index}
                className="dot"
                onClick={() => setCurrentSlide(index)}
                style={{ backgroundColor: index === currentSlide ? colors.primary : colors.white, cursor: 'pointer' }}
              ></span>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="logo-container">
            <div className="logo">
              <span style={{ color: colors.black }}>CLOSE</span>
              <span style={{ color: colors.primary }}>FLOW</span>
              <div style={{ color: colors.black, fontSize: '10px', letterSpacing: '2px' }}>ADMIN</div>
            </div>
          </div>

          <h1 className="login-title" style={{ color: colors.textDark }}>LOG IN</h1>

          <form
            onSubmit={passwordUi ? handlePasswordSubmit : (stage === 'otp' ? handleVerifyOtp : handleRequestOtp)}
            className="login-form"
          >
            <div className="form-group">
              <label htmlFor="email" style={{ color: colors.textDark }}>User Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ borderColor: colors.borderGrey, backgroundColor: colors.inputGrey, color: colors.textDark }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenant_slug" style={{ color: colors.textDark }}>Tenant Slug</label>
              <input
                type="text"
                id="tenant_slug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="demo"
                style={{ borderColor: colors.borderGrey, backgroundColor: colors.inputGrey, color: colors.textDark }}
              />
            </div>

            {/* Password box exists only for the tenants the server still
                offers it to (the demo institute). */}
            {passwordUi && (
              <div className="form-group">
                <label htmlFor="password" style={{ color: colors.textDark }}>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    style={{ borderColor: colors.borderGrey, backgroundColor: colors.inputGrey, color: colors.textDark }}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((s) => !s)}
                    style={{ color: colors.textMuted }}
                  >👁️</button>
                </div>
              </div>
            )}

            {/* ---- WhatsApp OTP sign-in ---- */}
            {!passwordUi && stage === 'credentials' && (
              <div className="form-group">
                <label htmlFor="phone" style={{ color: colors.textDark }}>
                  {needsPhone ? 'Mobile Number (WhatsApp)' : 'Registered Mobile Number'}
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="10-digit number"
                  required
                  style={{ borderColor: colors.borderGrey, backgroundColor: colors.inputGrey, color: colors.textDark }}
                />
                {needsPhone ? (
                  <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                    No mobile number is saved on this account yet. Enter the number you use on
                    WhatsApp — we&apos;ll send a code there and link it to your account.
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                    Must match the number saved on your account. Your admin can update it for you.
                  </div>
                )}
              </div>
            )}

            {!passwordUi && stage === 'otp' && (
              <div className="form-group">
                <label htmlFor="otp" style={{ color: colors.textDark }}>
                  Enter the {otpLength}-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, otpLength))}
                  placeholder={'•'.repeat(otpLength)}
                  autoFocus
                  required
                  style={{ borderColor: colors.borderGrey, backgroundColor: colors.inputGrey, color: colors.textDark, letterSpacing: 6, fontSize: 18 }}
                />
                <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                  Sent on WhatsApp{sentTo ? ` to ${sentTo}` : ''}.{' '}
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={submitting || resendIn > 0}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: resendIn > 0 ? 'default' : 'pointer',
                      color: resendIn > 0 ? colors.textMuted : colors.primary, fontSize: 12,
                    }}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setStage('credentials'); setOtp(''); setError('') }}
                  style={{ background: 'none', border: 'none', padding: 0, marginTop: 8, cursor: 'pointer', color: colors.textMuted, fontSize: 12 }}
                >
                  ← Use a different account
                </button>
              </div>
            )}

            {error && (
              <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={submitting || (!passwordUi && stage === 'otp' && otp.length < otpLength)}
              style={{ backgroundColor: colors.primary, color: colors.white, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting
                ? (passwordUi ? 'Logging in…' : stage === 'otp' ? 'Verifying…' : 'Sending…')
                : (passwordUi ? 'Login' : stage === 'otp' ? 'Verify & Login' : 'Send OTP on WhatsApp')}
            </button>
          </form>

          {/* Dev-only: pre-filled demo credentials. Remove before production. */}
          <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#78350f' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Demo credentials — tenant: <code>demo</code></div>
            <div style={{ display: 'grid', gap: 4 }}>
              <button type="button" onClick={() => { setEmail('admin@demo.local'); setPassword('ChangeMe123!'); setTenantSlug('demo'); }}
                style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 4, padding: 6, textAlign: 'left', cursor: 'pointer', color: '#78350f' }}>
                <b>Super Admin:</b> admin@demo.local
              </button>
              <button type="button" onClick={() => { setEmail('manager@demo.local'); setPassword('ChangeMe123!'); setTenantSlug('demo'); }}
                style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 4, padding: 6, textAlign: 'left', cursor: 'pointer', color: '#78350f' }}>
                <b>Sales Manager:</b> manager@demo.local
              </button>
              <button type="button" onClick={() => { setEmail('counsellor@demo.local'); setPassword('ChangeMe123!'); setTenantSlug('demo'); }}
                style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 4, padding: 6, textAlign: 'left', cursor: 'pointer', color: '#78350f' }}>
                <b>Counsellor:</b> counsellor@demo.local
              </button>
              <button type="button" onClick={() => { setEmail('accounts@demo.local'); setPassword('ChangeMe123!'); setTenantSlug('demo'); }}
                style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 4, padding: 6, textAlign: 'left', cursor: 'pointer', color: '#78350f' }}>
                <b>Accounts:</b> accounts@demo.local
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 11 }}>All passwords: <code>ChangeMe123!</code> · Click a role above to autofill.</div>
            <div style={{ marginTop: 4, fontSize: 11 }}>Student portal: <a href="/student/login" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{`${window.location.origin}/student/login`}</a></div>
            <div style={{ marginTop: 4, fontSize: 11 }}>Product Owner: <a href="http://localhost:5174" style={{ color: '#2563eb' }}>localhost:5174</a></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
