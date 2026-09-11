import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { auth } from './lib/api'
import { applyThemeFromUser } from './theme/applyTheme'
import { setAppTimezone } from './lib/appTimezone'

// Apply the user's saved theme BEFORE React mounts so the first paint is
// already in the right colors — no flash of red-then-purple. The user blob
// in localStorage carries theme_primary[_dark|_light]; if absent, the
// CSS-var defaults from index.css win automatically.
applyThemeFromUser(auth.getUser())

// Pin all date/time rendering to the tenant's timezone (Asia/Kolkata for every
// institute today) instead of the viewer's browser zone, so a lead created at
// 6:29 PM IST reads "6:29 PM" for everyone. Runs before React mounts so the
// first paint is already correct; re-applied on login (lib/api setSession).
setAppTimezone(auth.getTenant())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
