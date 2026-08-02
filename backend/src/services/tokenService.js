const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshTokenModel');

// Use Node's built-in crypto.randomUUID() instead of the uuid package.
// uuid v14 is ESM-only and throws ERR_REQUIRE_ESM on older Vercel Node runtimes.
const uuidv4 = () => crypto.randomUUID();

/**
 * Token service - generates, verifies and rotates JWT tokens.
 * Methods that touch the store are async (serverless / Redis compatible).
 */
const tokenService = {
  /**
   * Generate an access token for a user.
   * @param {object} user - user object (id, email, name)
   * @returns {string} signed JWT
   */
  generateAccessToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: 'access',
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    });
  },

  /**
   * Generate a refresh token. Includes a unique jti (tokenId) so we can track
   * rotation and detect reuse.
   * @param {object} user - user object
   * @param {string} familyId - optional; if provided the new token joins an existing family
   * @returns {Promise<{ token: string, tokenId: string, familyId: string, expiresAt: string }>}
   */
  async generateRefreshToken(user, familyId = null) {
    const tokenId = uuidv4();
    const newFamilyId = familyId || uuidv4();
    const expiresInMs = msFromString(process.env.REFRESH_TOKEN_EXPIRY || '7d');
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

    const payload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      jti: tokenId,
      familyId: newFamilyId,
    };

    const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
    });

    // Persist the token record so we can track rotation
    await RefreshToken.create({
      userId: user.id,
      tokenId,
      familyId: newFamilyId,
      expiresAt,
    });

    return { token, tokenId, familyId: newFamilyId, expiresAt };
  },

  /**
   * Verify an access token.
   * @param {string} token
   * @returns {object|null} decoded payload or null if invalid
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      if (decoded.type !== 'access') return null;
      return decoded;
    } catch (err) {
      return null;
    }
  },

  /**
   * Verify a refresh token's signature and check its record is still valid.
   * Does NOT mark it as rotated yet - that's done by rotateRefreshToken.
   * @param {string} token
   * @returns {Promise<{ payload: object, record: object }|null>}
   */
  async verifyRefreshToken(token) {
    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return null; // Invalid/expired signature
    }

    if (payload.type !== 'refresh') return null;

    const record = await RefreshToken.findByTokenId(payload.jti);
    if (!record) return null;

    // Check expiry
    if (Date.parse(record.expiresAt) < Date.now()) return null;

    // Check not revoked
    if (record.revoked) return null;

    return { payload, record };
  },

  /**
   * Rotate a refresh token:
   * - If the presented token is already rotated (stale), this is token reuse
   *   -> revoke the entire family and return null.
   * - Otherwise mark the presented token as rotated and issue a NEW refresh
   *   token in the same family, plus a fresh access token.
   *
   * @param {string} refreshToken - the presented refresh token
   * @param {object} user - the authenticated user
   * @returns {Promise<{ accessToken: string, refreshToken: string, newRecord: object }|null>}
   */
  async rotateRefreshToken(refreshToken, user) {
    const verified = await this.verifyRefreshToken(refreshToken);
    if (!verified) return null;

    const { record } = verified;

    // REUSE DETECTION: if this token was already used (rotated), an attacker
    // may be replaying it. Revoke the whole family.
    if (record.rotated) {
      await RefreshToken.revokeFamily(record.familyId);
      return null;
    }

    // Valid token - mark as rotated and issue a new pair in the same family
    await RefreshToken.markRotated(record.tokenId);

    const accessToken = this.generateAccessToken(user);
    const newRefresh = await this.generateRefreshToken(user, record.familyId);

    return {
      accessToken,
      refreshToken: newRefresh.token,
      newRecord: newRefresh,
    };
  },

  /**
   * Revoke a single refresh token (logout).
   * @param {string} refreshToken
   * @returns {Promise<boolean>} true if revoked
   */
  async revokeRefreshToken(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return false;
    }
    const record = await RefreshToken.findByTokenId(payload.jti);
    if (!record) return false;
    await RefreshToken.revoke(record.tokenId);
    return true;
  },

  /**
   * Get a hashed version of a token (for secure storage, if needed later).
   * @param {string} token
   * @returns {string}
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },
};

/**
 * Convert a string like '7d', '15m', '1h' to milliseconds.
 * @param {string} str
 * @returns {number}
 */
function msFromString(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * multipliers[unit];
}

module.exports = tokenService;

