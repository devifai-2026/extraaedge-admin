# Color Theme Setup - Quick Reference

## 🎨 Global Color Theme Implementation

Your app now has a **centralized color theme** that can be updated from a single file.

### File Structure
```
src/
├── theme/
│   ├── colors.js          ← UPDATE COLOR VALUES HERE
│   └── globalStyles.js
├── components/
│   └── Login.jsx          ← Example: Using colors in components
├── styles/
│   └── Login.css          ← CSS with theme variables
├── index.css              ← Global CSS with --color variables
└── App.jsx                ← Routing setup
```

---

## 📝 How to Change Colors

Edit **`src/theme/colors.js`** to update colors globally:

```javascript
export const colors = {
  primary: '#FF6B35',      // Red/Orange - change this to change PRIMARY everywhere
  black: '#1A1A1A',        // Black
  white: '#FFFFFF',        // White
  darkBg: '#3E3B52',      // Dark background
  // ... more colors
};
```

### Changes automatically apply to:
- ✅ All React components using `colors` from `src/theme/colors.js`
- ✅ CSS variables in `src/index.css` 
- ✅ Login page & all future pages

---

## 🔧 Using Colors in Components

### In JavaScript (React Components):
```jsx
import { colors } from '../theme/colors'

function MyComponent() {
  return (
    <div style={{ backgroundColor: colors.primary, color: colors.white }}>
      Hello World
    </div>
  )
}
```

### In CSS:
```css
.my-button {
  background-color: var(--primary);
  color: var(--text-light);
  border: 2px solid var(--black);
}
```

---

## 🎯 Current Color Palette

| Use Case | Variable | CSS Variable | Color |
|----------|----------|---------|-------|
| **Buttons/Accents** | `colors.primary` | `--primary` | `#FF6B35` (Red) |
| **Text/Elements** | `colors.black` | `--black` | `#1A1A1A` |
| **Background** | `colors.white` | `--white` | `#FFFFFF` |
| **Page Background** | `colors.darkBg` | `--dark-bg` | `#3E3B52` |
| **Links** | `colors.accentRed` | `--accent-red` | `#E74C3C` |

---

## ✨ Example: Adding a New Page with Theme

```jsx
// src/components/Dashboard.jsx
import { colors } from '../theme/colors'
import '../styles/Dashboard.css'

function Dashboard() {
  return (
    <div style={{ backgroundColor: colors.darkBg }}>
      <h1 style={{ color: colors.white }}>Dashboard</h1>
      <button style={{ 
        backgroundColor: colors.primary,
        color: colors.white 
      }}>
        Action Button
      </button>
    </div>
  )
}
```

Then add to **`src/App.jsx`**:
```jsx
<Route path="/dashboard" element={<Dashboard />} />
```

---

## 🚀 To Start Dev Server
```bash
npm run dev
```

The app will open on `http://localhost:5173` with your login page at `/`
