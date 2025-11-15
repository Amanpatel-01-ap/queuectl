const { db } = require('../lib/persistence');

function listJobs(options) {
  const stateFilter = options.state ? `WHERE state='${options.state}'` : '';
  db.all(`SELECT * FROM jobs ${stateFilter}`, [], (err, rows) => {
    if (err) return console.error('Error listing jobs:', err.message);
    console.table(rows);
  });
}

module.exports = listJobs;
