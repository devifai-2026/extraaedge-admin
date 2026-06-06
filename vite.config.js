import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
