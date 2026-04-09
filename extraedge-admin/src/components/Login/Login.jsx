// import '../styles/Login.css'
import './Login.css'
import { useState, useEffect } from 'react'
import { colors } from '../../theme/colors'

function Login() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: 'Qualify',
      description: 'Identify the potential hot prospects from massive data using automated workflows.',
    },
    {
      title: 'Communicate',
      description: 'Easy follow-ups with leads through marketing automation across all communication channels.',
    },
    {
      title: 'Analyse',
      description: 'Analyse data, view dashboards and improve conversions by tracking what matters the most.',
    }
  ]

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const QualifyIcon = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke={colors.white} strokeWidth="2"/>
      <line x1="30" y1="35" x2="70" y2="35" stroke={colors.white} strokeWidth="2"/>
      <line x1="30" y1="45" x2="70" y2="45" stroke={colors.white} strokeWidth="2"/>
      <line x1="30" y1="55" x2="50" y2="55" stroke={colors.white} strokeWidth="2"/>
      <circle cx="60" cy="50" r="8" fill={colors.primary}/>
    </svg>
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login submitted')
  }

  return (
    <div 
      className="login-container"
      style={{ backgroundColor: colors.darkBg }}
    >
      {/* Left Section - Carousel */}
      <div className="login-left">
        <div className="qualify-content">
          <div className="qualify-icon">
            <QualifyIcon />
          </div>
          <h2 style={{ color: colors.white }}>{slides[currentSlide].title}</h2>
          <p style={{ color: colors.textMuted }}>
            {slides[currentSlide].description}
          </p>
          <div className="carousel-dots">
            {slides.map((_, index) => (
              <span
                key={index}
                className="dot"
                onClick={() => goToSlide(index)}
                style={{
                  backgroundColor: index === currentSlide ? colors.primary : colors.white,
                  cursor: 'pointer'
                }}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="login-right">
        <div className="login-card">
          {/* Logo */}
          <div className="logo-container">
            <div className="logo">
              <span style={{ color: colors.black }}>SPEED</span>
              <span style={{ color: colors.primary }}>UP</span>
              <div style={{ color: colors.black, fontSize: '10px', letterSpacing: '2px' }}>INFOTECH</div>
            </div>
          </div>

          {/* Title */}
          <h1 
            className="login-title"
            style={{ color: colors.textDark }}
          >
            LOG IN
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email" style={{ color: colors.textDark }}>User Email</label>
              <input
                type="email"
                id="email"
                placeholder="counsellor4@speedupinfotech.com"
                defaultValue="counsellor4@speedupinfotech.com"
                style={{
                  borderColor: colors.borderGray,
                  backgroundColor: colors.lightGray,
                  color: colors.textDark
                }}
              />
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password" style={{ color: colors.textDark }}>Password</label>
              <div className="password-input-wrapper">
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••••"
                  defaultValue="••••••••"
                  style={{
                    borderColor: colors.borderGray,
                    backgroundColor: colors.lightGray,
                    color: colors.textDark
                  }}
                />
                <button 
                  type="button"
                  className="toggle-password"
                  style={{ color: colors.textMuted }}
                >
                  👁️
                </button>
              </div>
              <div className="forgot-password">
                <a href="#" style={{ color: colors.primary }}>Update/Forgot Password?</a>
              </div>
            </div>

            {/* Remember Me */}
            <div className="form-group checkbox">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" style={{ color: colors.textDark }}>Remember me</label>
            </div>

            {/* Login Button */}
            <button 
              type="submit"
              className="login-btn"
              style={{ backgroundColor: colors.primary, color: colors.white }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
