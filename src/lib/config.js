// Backend host resolution, in priority order:
//   1. VITE_SERVER_HOST env var (set this on Render to point at any backend)
//   2. import.meta.env.PROD  → the deployed backend (production build)
//   3. local dev server
//
// This means a `vite build` (Render's build step sets PROD=true) automatically
// targets the deployed backend instead of localhost — so a reload / direct
// API call from the Render-hosted frontend never tries to reach localhost:4000.
// `api.js` and `socket.js` additionally honor VITE_API_BASE_URL, which wins
// over everything here when set.
const PROD_HOST = 'https://extraaedge-server.onrender.com';
const LOCAL_HOST = 'http://localhost:4000';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

// True on a production build (vite build); local `npm run dev` keeps it false.
export const isProd = env.PROD === true;

export const SERVER_HOST = env.VITE_SERVER_HOST || (isProd ? PROD_HOST : LOCAL_HOST);
export const API_URL = `${SERVER_HOST}/api/v1`;
