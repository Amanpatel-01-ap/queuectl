const { db } = require('./persistence');
const { v4: uuidv4 } = require('uuid');

function addJob(jobData) {
  const now = new Date().toISOString();
  const job = {
    id: jobData.id || uuidv4(),
    command: jobData.command,
    state: 'pending',
    attempts: 0,
    max_retries: Number.isFinite(jobData.max_retries)
      ? jobData.max_retries
      : 3,
    created_at: now,
    updated_at: now,
  };

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      `INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      job.id,
      job.command,
      job.state,
      job.attempts,
      job.max_retries,
      job.created_at,
      job.updated_at,
      function (err) {
        stmt.finalize();
        if (err) reject(err);
        else resolve(job);
      }
    );
  });
}

module.exports = { addJob };
