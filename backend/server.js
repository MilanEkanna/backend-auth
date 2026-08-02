require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./src/routes/authRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const db = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 8000;

// Ensure data files exist
db.ensureDataFiles();

// Middleware
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});

