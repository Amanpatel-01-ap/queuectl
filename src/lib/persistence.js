// src/lib/persistence.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../db/jobs.sqlite');

function initializeDB() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    // Create jobs table
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        state TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create config table BEFORE anything else uses it
    db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Insert defaults
    db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('max_retries', '3')`);
    db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('backoff_base', '2')`);
  });

  return db;
}

const db = initializeDB();
module.exports = { db };
