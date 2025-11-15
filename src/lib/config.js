const { db } = require('./persistence');

function getConfig(key) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT value FROM config WHERE key=?`, [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO config (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      [key, value],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

module.exports = { getConfig, setConfig };
