/**
 * Simple CORS middleware.
 *
 * On Vercel, the frontend and API are served from the same origin, so CORS is
 * usually not needed. But if the frontend is deployed elsewhere (e.g. a custom
 * domain pointing at the API), or during local development where the frontend
 * runs on :5173 and the API on :8000, we need to allow cross-origin requests.
 *
 * Allowed origins come from the CORS_ORIGINS env var (comma-separated).
 * When empty, we allow the Vite dev server origin (http://localhost:5173).
 */
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://backend-auth.vercel.app',
];

function getAllowedOrigins() {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map((s) => s.trim());
  }
  return DEFAULT_ORIGINS;
}

module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
};

