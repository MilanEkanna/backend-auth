const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFRESH_TOKENS_FILE = path.join(DATA_DIR, 'refreshTokens.json');

/**
 * Vercel-compatible data store.
 *
 * Vercel is serverless — the filesystem is ephemeral. To persist users and
 * refresh-token families across invocations we use Upstash Redis (Vercel KV).
 *
 *  - If KV_REST_API_URL and KV_REST_API_TOKEN env vars are present (i.e. on
 *    Vercel), we use Redis as the storage engine.
 *  - Otherwise (local development), we fall back to the original JSON files.
 *
 * All public methods are async so the same code path works for both engines.
 */

// ---- Redis engine ----------------------------------------------------------
let redis = null;

function isRedisConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getRedis() {
  if (!redis && isRedisConfigured()) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return redis;
}

async function redisGetArray(key) {
  const value = await getRedis().get(key);
  return Array.isArray(value) ? value : [];
}

async function redisSetArray(key, data) {
  await getRedis().set(key, JSON.stringify(data));
  return data;
}

// ---- In-memory engine (fallback when neither Redis nor file system works) ---
// Used on Vercel when KV (Redis) env vars are not configured.
// Data is ephemeral — lost on cold start. Good enough for a learning app.
const memoryStore = {
  users: [],
  refreshTokens: [],
};

function isReadOnlyFS() {
  // Detect if we're on Vercel by checking if tmp is the only writable dir
  return process.env.VERCEL === '1';
}

// ---- File engine (local dev) ----------------------------------------------
function ensureDataFiles() {
  // On Vercel, filesystem is read-only — skip file creation
  if (isReadOnlyFS()) return;
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
    // Silently fall back to in-memory storage if FS is read-only
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

// ---- Public store API (async) ---------------------------------------------
const db = {
  usersFile: USERS_FILE,
  refreshTokensFile: REFRESH_TOKENS_FILE,
  isRedisConfigured,
  ensureDataFiles,

/**
   * Read an array of records for a collection.
   * @param {'users' | 'refreshTokens'} collection
   * @returns {Promise<Array>}
   */
  async readCollection(collection) {
    if (isRedisConfigured()) {
      return redisGetArray(collection);
    }
    // On Vercel without KV, use in-memory storage (filesystem is read-only)
    if (isReadOnlyFS()) {
      return memoryStore[collection] || [];
    }
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    try {
      return fileReadJSON(file);
    } catch (err) {
      // If file read fails (e.g. read-only FS), fall back to in-memory
      return memoryStore[collection] || [];
    }
  },

  /**
   * Write an array of records for a collection.
   * @param {'users' | 'refreshTokens'} collection
   * @param {Array} data
   * @returns {Promise<Array>}
   */
  async writeCollection(collection, data) {
    if (isRedisConfigured()) {
      return redisSetArray(collection, data);
    }
    // On Vercel without KV, use in-memory storage (filesystem is read-only)
    if (isReadOnlyFS()) {
      memoryStore[collection] = data;
      return data;
    }
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    try {
      fileWriteJSON(file, data);
    } catch (err) {
      // If file write fails, store in memory instead
      memoryStore[collection] = data;
    }
    return data;
  },
};

module.exports = db;

