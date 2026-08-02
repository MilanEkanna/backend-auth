const { v4: uuidv4 } = require('uuid');
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
 */
const RefreshToken = {
  /**
   * Get all refresh token records.
   * @returns {Array}
   */
  getAll() {
    return db.readJSON(db.refreshTokensFile);
  },

  /**
   * Find a record by its tokenId (jti claim in the JWT).
   * @param {string} tokenId
   * @returns {object|null}
   */
  findByTokenId(tokenId) {
    const tokens = this.getAll();
    return tokens.find((t) => t.tokenId === tokenId) || null;
  },

  /**
   * Create a new refresh token record.
   * @param {{ userId: string, tokenId: string, familyId: string, expiresAt: string }} data
   * @returns {object} the created record
   */
  create({ userId, tokenId, familyId, expiresAt }) {
    const tokens = this.getAll();
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
    db.writeJSON(db.refreshTokensFile, tokens);
    return record;
  },

  /**
   * Mark a token as rotated (used to issue a new pair).
   * @param {string} tokenId
   */
  markRotated(tokenId) {
    const tokens = this.getAll();
    const index = tokens.findIndex((t) => t.tokenId === tokenId);
    if (index !== -1) {
      tokens[index].rotated = true;
      tokens[index].lastRotatedAt = new Date().toISOString();
      db.writeJSON(db.refreshTokensFile, tokens);
    }
  },

  /**
   * Revoke a single token record.
   * @param {string} tokenId
   */
  revoke(tokenId) {
    const tokens = this.getAll();
    const index = tokens.findIndex((t) => t.tokenId === tokenId);
    if (index !== -1) {
      tokens[index].revoked = true;
      db.writeJSON(db.refreshTokensFile, tokens);
    }
  },

  /**
   * Revoke ALL tokens in a family. Used when token reuse is detected.
   * @param {string} familyId
   */
  revokeFamily(familyId) {
    const tokens = this.getAll();
    let changed = false;
    tokens.forEach((t) => {
      if (t.familyId === familyId && !t.revoked) {
        t.revoked = true;
        changed = true;
      }
    });
    if (changed) {
      db.writeJSON(db.refreshTokensFile, tokens);
    }
  },

  /**
   * Revoke all tokens belonging to a user (used on logout-all / security).
   * @param {string} userId
   */
  revokeAllForUser(userId) {
    const tokens = this.getAll();
    let changed = false;
    tokens.forEach((t) => {
      if (t.userId === userId && !t.revoked) {
        t.revoked = true;
        changed = true;
      }
    });
    if (changed) {
      db.writeJSON(db.refreshTokensFile, tokens);
    }
  },

  /**
   * Delete expired records to keep the store clean.
   */
  cleanupExpired() {
    const tokens = this.getAll();
    const now = Date.now();
    const filtered = tokens.filter((t) => Date.parse(t.expiresAt) > now);
    if (filtered.length !== tokens.length) {
      db.writeJSON(db.refreshTokensFile, filtered);
    }
  },
};

module.exports = RefreshToken;

