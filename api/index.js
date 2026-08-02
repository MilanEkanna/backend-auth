/**
 * Vercel Serverless Function entry point.
 *
 * Vercel is serverless — instead of calling app.listen(), we export the
 * Express app and Vercel wraps it into a serverless function. Every request
 * to /api/* is routed here by vercel.json.
 */
const app = require('../backend/app');

module.exports = app;

