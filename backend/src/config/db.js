const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFRESH_TOKENS_FILE = path.join(DATA_DIR, 'refreshTokens.json');

/**
 * Ensures the data directory and JSON files exist.
 * Creates them if missing.
 */
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  [USERS_FILE, REFRESH_TOKENS_FILE].forEach((file) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([]));
    }
  });
}

/**
 * Reads a JSON file and returns its parsed content.
 * @param {string} filePath - absolute path of the file
 * @returns {Array|object}
 */
function readJSON(filePath) {
  ensureDataFiles();
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Writes data to a JSON file.
 * @param {string} filePath - absolute path of the file
 * @param {Array|object} data - data to persist
 */
function writeJSON(filePath, data) {
  ensureDataFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Synchronous file-based operations to keep things simple.
 * In production you would use a real database (MongoDB, Postgres, etc.).
 */
const db = {
  usersFile: USERS_FILE,
  refreshTokensFile: REFRESH_TOKENS_FILE,
  ensureDataFiles,
  readJSON,
  writeJSON,
};

module.exports = db;

