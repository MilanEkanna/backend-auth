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

// ---- File engine (local dev) ----------------------------------------------
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
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    return fileReadJSON(file);
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
    const file = collection === 'users' ? USERS_FILE : REFRESH_TOKENS_FILE;
    fileWriteJSON(file, data);
    return data;
  },
};

module.exports = db;

