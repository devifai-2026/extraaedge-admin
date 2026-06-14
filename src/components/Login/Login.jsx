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

  const QualifyIcon = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="35" x2="70" y2="35" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="45" x2="70" y2="45" stroke={colors.white} strokeWidth="2" />
      <line x1="30" y1="55" x2="50" y2="55" stroke={colors.white} strokeWidth="2" />
      <circle cx="60" cy="50" r="8" fill={colors.primary} />
    </svg>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        ...(tenantSlug.trim() ? { tenant_slug: tenantSlug.trim() } : {}),
      })
      const payload = res?.data ?? res
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
    } catch (err) {
      setError(err.message || 'Login failed')
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
              <span style={{ color: colors.black }}>EXTRA</span>
              <span style={{ color: colors.primary }}>EDGE</span>
              <div style={{ color: colors.black, fontSize: '10px', letterSpacing: '2px' }}>ADMIN</div>
            </div>
          </div>

          <h1 className="login-title" style={{ color: colors.textDark }}>LOG IN</h1>

          <form onSubmit={handleSubmit} className="login-form">
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
              <div className="forgot-password">
                <a href="#" style={{ color: colors.primary }}>Update/Forgot Password?</a>
              </div>
            </div>

            {error && (
              <div style={{ color: '#d32f2f', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={submitting}
              style={{ backgroundColor: colors.primary, color: colors.white, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Logging in…' : 'Login'}
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
            <div style={{ marginTop: 4, fontSize: 11 }}>Product Owner: <a href="http://localhost:5174" style={{ color: '#2563eb' }}>localhost:5174</a></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
