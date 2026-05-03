import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { auth } from './lib/api'
import { applyThemeFromUser } from './theme/applyTheme'

// Apply the user's saved theme BEFORE React mounts so the first paint is
// already in the right colors — no flash of red-then-purple. The user blob
// in localStorage carries theme_primary[_dark|_light]; if absent, the
// CSS-var defaults from index.css win automatically.
applyThemeFromUser(auth.getUser())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
