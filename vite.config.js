import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// SPA deep-link fallback for Render. Render's static host serves `404.html`
// for any path that doesn't match a real file, and (unlike Netlify) it does
// NOT honor a `_redirects` file. So after the build we copy the compiled
// index.html to 404.html — a hard reload of /leadlist (or any client route)
// then serves the SPA shell instead of a bare 404, and React Router takes
// over. Keeping it a build step means the two files never drift apart.
const spaFallback = () => ({
  name: 'spa-404-fallback',
  apply: 'build',
  closeBundle() {
    const dist = resolve(__dirname, 'dist')
    const index = resolve(dist, 'index.html')
    if (existsSync(index)) copyFileSync(index, resolve(dist, '404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  // Vite v8 ships with rolldown, which is stricter than rollup when
  // resolving default-imports from packages that ship only a CommonJS
  // `main`. `qrcode` is one such package — `import QRCode from "qrcode"`
  // works locally because the dev server pre-bundles via esbuild, but
  // the production build (rolldown) refuses to resolve it. Pre-bundling
  // it here normalises the module shape across dev + build.
  optimizeDeps: {
    include: ['qrcode'],
  },
})
