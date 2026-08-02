const tokenService = require('../services/tokenService');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');

/**
 * Protect middleware - verifies the access token in the Authorization header.
 * Adds req.user with the decoded payload.
 */
function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Not authorized. Access token missing.'));
  }

  const token = authHeader.split(' ')[1];
  const decoded = tokenService.verifyAccessToken(token);

  if (!decoded) {
    return next(new AppError(401, 'Not authorized. Invalid or expired access token.'));
  }

  // Ensure the user still exists
  const user = User.findById(decoded.sub);
  if (!user) {
    return next(new AppError(401, 'Not authorized. User no longer exists.'));
  }

  // Attach user info to request
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  next();
}

module.exports = { protect };

