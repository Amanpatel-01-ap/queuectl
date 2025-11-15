const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('db/jobs.sqlite');

db.get(
  "SELECT id FROM jobs WHERE state='dead' LIMIT 1;",
  [],
  (err, row) => {
    if (row) console.log(row.id);
    db.close();
  }
);