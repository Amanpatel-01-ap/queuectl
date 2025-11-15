const { db } = require('../lib/persistence');

function status() {
  const states = ['pending', 'processing', 'completed', 'failed', 'dead'];
  const counts = {};

  let pendingQueries = states.length;

  states.forEach((s) => {
    db.get(`SELECT COUNT(*) as count FROM jobs WHERE state=?`, [s], (err, row) => {
      counts[s] = row?.count || 0;
      if (--pendingQueries === 0) console.table(counts);
    });
  });
}

module.exports = status;
