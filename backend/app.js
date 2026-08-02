/**
 * Express application factory.
 *
 * This file ONLY builds the Express app (middleware + routes) and exports it.
 * It does NOT call app.listen() — that is what server.js does for local
 * development, and what the Vercel serverless function (api/index.js) relies on.
 */
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./src/routes/authRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const corsMiddleware = require('./src/middleware/corsMiddleware');

const app = express();

// Security: hide Express fingerprint
app.disable('x-powered-by');

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;

