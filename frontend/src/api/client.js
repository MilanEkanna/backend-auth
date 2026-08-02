import axios from 'axios';
import learningLogger from '../utils/learningLogger';

/**
 * Base URL for auth endpoints.
 *
 * - Local development: Vite dev server proxies /api → http://localhost:8000
 *   (see vite.config.js), so we can use a relative path and httpOnly cookies
 *   just work.
 * - Production (Vercel): the frontend and the serverless API are deployed
 *   together on the same domain, so /api/auth also works with a relative path.
 *
 * If you deploy the backend separately, set VITE_API_URL to its full origin
 * (e.g. https://my-api.vercel.app) — the app will use it automatically.
 */
const BASE_URL = (import.meta.env.VITE_API_URL || '/api/auth').replace(/\/$/, '');

/**
 * Raw axios instance (used internally for the silent refresh call).
 */
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Public axios instance used by the auth context. We keep it separate from
 * the raw instance so that the interceptor (auto refresh) does not loop
 * on itself.
 */
export const authApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Where we store the access token in memory (not localStorage for safety).
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

// Attach the access token to every outgoing request.
authApi.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Silent refresh: POST /api/auth/refresh using the httpOnly cookie.
 * Returns the new token pair (also sets the new refresh cookie server side).
 */
async function silentRefresh() {
  const res = await api.post('/refresh');
  return res.data.data;
}

// Response interceptor: on 401, try to refresh once, then replay the request.
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh for 401s that have not been retried.
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        learningLogger.info('🔄 Access token expired → attempting silent refresh...', 'interceptor');
        refreshPromise = refreshPromise || silentRefresh();
        const data = await refreshPromise;
        refreshPromise = null;

        setAccessToken(data.accessToken);
        learningLogger.success('✓ Silent refresh succeeded. New access token issued.', 'interceptor');

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return authApi(original);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        learningLogger.error('✗ Silent refresh failed. Session expired.', 'interceptor');
        // Let the caller (AuthContext) know the session is dead.
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

