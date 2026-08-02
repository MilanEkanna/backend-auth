const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

/**
 * User model - handles persistence of users in the JSON file store.
 * Note: Passwords should be hashed before calling createUser.
 */
const User = {
  /**
   * Get all users from the store.
   * @returns {Array}
   */
  getAll() {
    return db.readJSON(db.usersFile);
  },

  /**
   * Find a user by their unique id.
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    const users = this.getAll();
    return users.find((u) => u.id === id) || null;
  },

  /**
   * Find a user by email (case-insensitive).
   * @param {string} email
   * @returns {object|null}
   */
  findByEmail(email) {
    const users = this.getAll();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  /**
   * Create a new user.
   * @param {{ name: string, email: string, passwordHash: string }} userData
   * @returns {object} the created user (without passwordHash)
   */
  create({ name, email, passwordHash }) {
    const users = this.getAll();
    const newUser = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    db.writeJSON(db.usersFile, users);
    // Return user without sensitive data
    const { passwordHash: _ph, ...safeUser } = newUser;
    return safeUser;
  },

  /**
   * Update a user by id.
   * @param {string} id
   * @param {object} updates
   * @returns {object|null} updated user or null if not found
   */
  updateById(id, updates) {
    const users = this.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    db.writeJSON(db.usersFile, users);
    const { passwordHash: _ph, ...safeUser } = users[index];
    return safeUser;
  },

  /**
   * Delete a user by id.
   * @param {string} id
   * @returns {boolean}
   */
  deleteById(id) {
    const users = this.getAll();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    db.writeJSON(db.usersFile, filtered);
    return true;
  },
};

module.exports = User;

