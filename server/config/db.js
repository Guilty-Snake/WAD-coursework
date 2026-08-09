// config/db.js
// Uses Node's BUILT-IN sqlite module (node:sqlite) instead of better-sqlite3.
// Deliberate choice: better-sqlite3 is a native addon that must be compiled
// per Node version/OS/arch via node-gyp, which repeatedly failed to build on
// newer Node versions on Apple Silicon (missing prebuilt binary + local
// toolchain issues). node:sqlite ships inside Node itself (stable from
// Node 22.5+, no native compile step, no node_modules native binary at all)
// and exposes a near-identical synchronous prepare/run/get/all API.
require('dotenv').config();
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './library.db');
const db = new DatabaseSync(dbPath);

// Enforce foreign key constraints (SQLite has them off by default).
db.exec('PRAGMA foreign_keys = ON');
// journal_mode WAL improves concurrent read/write behaviour during dev.
db.exec('PRAGMA journal_mode = WAL');

module.exports = db;
