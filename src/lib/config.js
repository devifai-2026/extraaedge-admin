// Flip this to switch between the deployed backend and a local dev server.
export const isProd = true;

const PROD_HOST = 'https://extraaedge-server.onrender.com';
const LOCAL_HOST = 'http://localhost:4000';

export const SERVER_HOST = isProd ? PROD_HOST : LOCAL_HOST;
export const API_URL = `${SERVER_HOST}/api/v1`;
