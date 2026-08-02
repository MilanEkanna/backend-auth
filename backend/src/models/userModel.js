const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

/**
 * User model - handles persistence of users in the store (Vercel KV/Redis on
 * Vercel, JSON files locally).
 * Note: Passwords should be hashed before calling create.
 *
 * All methods are async to support the serverless-friendly Redis engine.
 */
const User = {
  /**
   * Get all users from the store.
   * @returns {Promise<Array>}
   */
  async getAll() {
    return db.readCollection('users');
  },

  /**
   * Find a user by their unique id.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const users = await this.getAll();
    return users.find((u) => u.id === id) || null;
  },

  /**
   * Find a user by email (case-insensitive).
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const users = await this.getAll();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  /**
   * Create a new user.
   * @param {{ name: string, email: string, passwordHash: string }} userData
   * @returns {Promise<object>} the created user (without passwordHash)
   */
  async create({ name, email, passwordHash }) {
    const users = await this.getAll();
    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await db.writeCollection('users', users);
    // Return user without sensitive data
    const { passwordHash: _ph, ...safeUser } = newUser;
    return safeUser;
  },

  /**
   * Update a user by id.
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<object|null>} updated user or null if not found
   */
  async updateById(id, updates) {
    const users = await this.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    await db.writeCollection('users', users);
    const { passwordHash: _ph, ...safeUser } = users[index];
    return safeUser;
  },

  /**
   * Delete a user by id.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const users = await this.getAll();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    await db.writeCollection('users', filtered);
    return true;
  },
};

module.exports = User;

