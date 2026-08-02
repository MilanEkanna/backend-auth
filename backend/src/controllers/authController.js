const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const tokenService = require('../services/tokenService');
const AppError = require('../utils/AppError');

// Cookie name for the refresh token
const REFRESH_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

// Allow a broader origin set (Vercel previews / production frontend).
// In production the VITE_API_URL / APP_URL should be set to the deployed URL.
const CORS_ORIGINS = (
  process.env.CORS_ORIGINS || process.env.APP_URL || '*'
).split(',').map((s) => s.trim());

/**
 * Send the access + refresh token pair to the client.
 * The refresh token is set as an httpOnly cookie (safer) AND returned in the body
 * so API clients can store it as they prefer.
 */
function sendTokenResponse(res, user, { accessToken, refreshToken }) {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = process.env.COOKIE_SECURE === 'true' || isProd;

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return res.json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
}

/**
 * POST /api/auth/register
 * Create a new user account.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return next(new AppError(400, 'Name, email and password are required.'));
    }
    if (password.length < 6) {
      return next(new AppError(400, 'Password must be at least 6 characters.'));
    }

    // Check if email already exists
    const existing = await User.findByEmail(email);
    if (existing) {
      return next(new AppError(409, 'An account with this email already exists.'));
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ name, email, passwordHash });

    // Issue token pair
    const accessToken = tokenService.generateAccessToken(user);
    const refresh = await tokenService.generateRefreshToken(user);

    return sendTokenResponse(res, user, {
      accessToken,
      refreshToken: refresh.token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate an existing user.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError(400, 'Email and password are required.'));
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Generic message to avoid user enumeration
      return next(new AppError(401, 'Invalid email or password.'));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError(401, 'Invalid email or password.'));
    }

    // Strip passwordHash
    const { passwordHash: _ph, ...safeUser } = user;

    // Issue token pair
    const accessToken = tokenService.generateAccessToken(safeUser);
    const refresh = await tokenService.generateRefreshToken(safeUser);

    return sendTokenResponse(res, safeUser, {
      accessToken,
      refreshToken: refresh.token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Rotate the refresh token -> new access + new refresh token.
 * Implements token rotation + reuse detection.
 */
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;

    if (!refreshToken) {
      return next(new AppError(401, 'Refresh token missing.'));
    }

    // Decode without verifying to find the user id
    let payload;
    try {
      payload = jwt.decode(refreshToken);
    } catch (err) {
      payload = null;
    }

    // Fetch the full user record so the new access token has complete claims
    let safeUser = null;
    if (payload && payload.sub) {
      const freshUser = await User.findById(payload.sub);
      if (freshUser) {
        const { passwordHash: _ph, ...rest } = freshUser;
        safeUser = rest;
      }
    }

    const rotated = await tokenService.rotateRefreshToken(refreshToken, safeUser);

    if (!rotated) {
      // Could be invalid/expired/revoked OR reuse detected (family revoked)
      return next(new AppError(401, 'Invalid or expired refresh token.'));
    }

    if (!safeUser) {
      return next(new AppError(401, 'User no longer exists.'));
    }

    return sendTokenResponse(res, safeUser, {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * Revoke the presented refresh token.
 */
async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;

    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    // Clear cookie
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout-all
 * Revoke all refresh tokens for the authenticated user.
 */
async function logoutAll(req, res, next) {
  try {
    await RefreshToken.revokeAllForUser(req.user.id);
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ success: true, message: 'Logged out from all devices.' });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user (protected route).
 */
function me(req, res) {
  return res.json({
    success: true,
    data: { user: req.user },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
};

