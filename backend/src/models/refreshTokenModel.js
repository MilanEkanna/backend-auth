const db = require('../config/db');

/**
 * RefreshToken model - manages refresh token records with family-based rotation.
 *
 * Token rotation concept:
 * - Every login creates a new token "family" (familyId).
 * - Each refresh token record belongs to a family and has a unique tokenId (jti).
 * - When a refresh token is used to get a new pair, the old record is marked
 *   as rotated and a new record (same family) is created.
 * - If a rotated (stale) token is used again, it signals token theft/replay,
 *   so we revoke the ENTIRE family.
 *
 * All methods are async to support the serverless-friendly Redis engine.
 */
const RefreshToken = {
  /**
   * Get all refresh token records.
   * @returns {Promise<Array>}
   */
  async getAll() {
    return db.readCollection('refreshTokens');
  },

  /**
   * Find a record by its tokenId (jti claim in the JWT).
   * @param {string} tokenId
   * @returns {Promise<object|null>}
   */
  async findByTokenId(tokenId) {
    const tokens = await this.getAll();
    return tokens.find((t) => t.tokenId === tokenId) || null;
  },

  /**
   * Create a new refresh token record.
   * @param {{ userId: string, tokenId: string, familyId: string, expiresAt: string }} data
   * @returns {Promise<object>} the created record
   */
  async create({ userId, tokenId, familyId, expiresAt }) {
    const tokens = await this.getAll();
    const record = {
      tokenId,
      userId,
      familyId,
      expiresAt,
      rotated: false,       // false = still valid for refresh
      revoked: false,       // false = not revoked
      createdAt: new Date().toISOString(),
      lastRotatedAt: null,
    };
    tokens.push(record);
    await db.writeCollection('refreshTokens', tokens);
    return record;
  },

  /**
   * Mark a token as rotated (used to issue a new pair).
   * @param {string} tokenId
   * @returns {Promise<void>}
   */
  async markRotated(tokenId) {
    const tokens = await this.getAll();
    const index = tokens.findIndex((t) => t.tokenId === tokenId);
    if (index !== -1) {
      tokens[index].rotated = true;
      tokens[index].lastRotatedAt = new Date().toISOString();
      await db.writeCollection('refreshTokens', tokens);
    }
  },

  /**
   * Revoke a single token record.
   * @param {string} tokenId
   * @returns {Promise<void>}
   */
  async revoke(tokenId) {
    const tokens = await this.getAll();
    const index = tokens.findIndex((t) => t.tokenId === tokenId);
    if (index !== -1) {
      tokens[index].revoked = true;
      await db.writeCollection('refreshTokens', tokens);
    }
  },

  /**
   * Revoke ALL tokens in a family. Used when token reuse is detected.
   * @param {string} familyId
   * @returns {Promise<void>}
   */
  async revokeFamily(familyId) {
    const tokens = await this.getAll();
    let changed = false;
    tokens.forEach((t) => {
      if (t.familyId === familyId && !t.revoked) {
        t.revoked = true;
        changed = true;
      }
    });
    if (changed) {
      await db.writeCollection('refreshTokens', tokens);
    }
  },

  /**
   * Revoke all tokens belonging to a user (used on logout-all / security).
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async revokeAllForUser(userId) {
    const tokens = await this.getAll();
    let changed = false;
    tokens.forEach((t) => {
      if (t.userId === userId && !t.revoked) {
        t.revoked = true;
        changed = true;
      }
    });
    if (changed) {
      await db.writeCollection('refreshTokens', tokens);
    }
  },

  /**
   * Delete expired records to keep the store clean.
   * @returns {Promise<void>}
   */
  async cleanupExpired() {
    const tokens = await this.getAll();
    const now = Date.now();
    const filtered = tokens.filter((t) => Date.parse(t.expiresAt) > now);
    if (filtered.length !== tokens.length) {
      await db.writeCollection('refreshTokens', filtered);
    }
  },
};

module.exports = RefreshToken;

