/**
 * Centralized error-handling middleware.
 * Must be registered LAST, after all routes.
 */
function errorHandler(err, req, res, next) {
  // Operational (expected) errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload.',
    });
  }

  // Unknown / unexpected errors
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
}

module.exports = errorHandler;

