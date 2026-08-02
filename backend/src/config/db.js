const fs = require('fs');
const path = require('path');

/**
 * Lightweight data store with two backends:
 *
 * - In-memory (default on Vercel): data lives in a JS object, ephemeral.
 * - JSON file (local dev): persists to the data/ directory.
 *
 * On Vercel the filesystem is read-only, so we always use the in-memory engine.
 * Locally we use JSON files so data survives restarts.
 *
 * All methods are async for consistency (the Redis version was async too).
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFRESH_TOKENS_FILE = path.join(DATA_DIR, 'refreshTokens.json');

// ---- In-memory engine (used on Vercel) ------------------------------------
const memoryStore = {
  users: [],
  refreshTokens: [],
};

function isOnVercel() {
  return process.env.VERCEL === '1';
}

// ---- File engine (used locally) -------------------------------------------
function ensureDataFiles() {
  if (isOnVercel()) return; // filesystem is read-only
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    [USERS_FILE, REFRESH_TOKENS_FILE].forEach((file) => {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([]));
      }
    });
  } catch (err) {
    console.warn('⚠️ File system not writable, using in-memory storage.');
  }
}

function fileReadJSON(filePath) {
  ensureDataFiles();
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function fileWriteJSON(filePath, data) {
  ensureDataFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---- Public store API ------------------------------------------------------
const db = {
  usersFile: USERS_FILE,
  refreshTokensFile: REFRESH_TOKENS_FILE,
  ensureDataFiles,

  async readCollection(collection) {
    if (isOnVercel()) {
      return memoryStore[collection] || [];
    }
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    try {
      return fileReadJSON(file);
    } catch (err) {
      return memoryStore[collection] || [];
    }
  },

  async writeCollection(collection, data) {
    if (isOnVercel()) {
      memoryStore[collection] = data;
      return data;
    }
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    try {
      fileWriteJSON(file, data);
    } catch (err) {
      memoryStore[collection] = data;
    }
    return data;
  },
};

module.exports = db;

