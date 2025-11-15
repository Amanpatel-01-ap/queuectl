// src/workerChild.js
const { db } = require('./lib/persistence');
const { exec } = require('child_process');
const { getConfig, initConfig } = require('./lib/config');
const { log } = require('./lib/logger');



let stopSignal = false;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function getNextPendingJob() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN IMMEDIATE", (err) => {
        if (err) return resolve(null);

        db.get(
          `SELECT * FROM jobs WHERE state='pending' ORDER BY created_at LIMIT 1`,
          [],
          (err, job) => {
            if (err) {
              db.run("COMMIT");
              return reject(err);
            }

            if (!job) {
              db.run("COMMIT");
              return resolve(null);
            }

            db.run(
              `UPDATE jobs SET state='processing', updated_at=? WHERE id=?`,
              [new Date().toISOString(), job.id],
              (updateErr) => {
                db.run("COMMIT");
                if (updateErr) return reject(updateErr);
                resolve(job);
              }
            );
          }
        );
      });
    });
  });
}

function executeJob(job) {
  return new Promise((resolve) => {
    log(`🚀 [${job.id}] Executing: ${job.command}`);

    exec(job.command, (error, stdout) => {
      if (error) {
        log(`❌ [${job.id}] Failed: ${error.message}`);
        return resolve(false);
      }

      log(`✅ [${job.id}] Success: ${stdout.trim()}`);
      resolve(true);
    });
  });
}

function updateAttemptsState(jobId, newState, attempts) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE jobs SET state=?, attempts=?, updated_at=? WHERE id=?`,
      [newState, attempts, new Date().toISOString(), jobId],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

async function handleJobFailure(job) {
  const newAttempts = job.attempts + 1;

  const maxRetries = parseInt(await getConfig('max_retries') || job.max_retries);
  const base = parseInt(await getConfig('backoff_base') || 2);

  if (newAttempts >= maxRetries) {
    log(`☠️ [${job.id}] Max retries reached → DLQ`);
    await updateAttemptsState(job.id, 'dead', newAttempts);
    return;
  }

  const delay = Math.pow(base, newAttempts) * 1000;
  log(`🔁 [${job.id}] Retry #${newAttempts} in ${delay / 1000}s`);

  await updateAttemptsState(job.id, 'failed', newAttempts);

  setTimeout(() => {
    db.run(
      `UPDATE jobs SET state='pending', updated_at=? WHERE id=?`,
      [new Date().toISOString(), job.id]
    );
  }, delay);
}

async function startWorker(workerId) {
  // Recover previously interrupted jobs
  db.run(
    `UPDATE jobs SET state='pending', updated_at=? WHERE state='processing'`,
    [new Date().toISOString()],
    function (err) {
      if (!err && this.changes > 0) {
        log(`♻️ Recovered ${this.changes} unfinished job(s) to pending.`);
      }
    }
  );

  log(`👷 Worker ${workerId} started.`);

  while (!stopSignal) {
    const job = await getNextPendingJob();

    if (!job) {
      await sleep(2000);
      continue;
    }

    const success = await executeJob(job);

    if (success) {
      await updateAttemptsState(job.id, 'completed', job.attempts);
    } else {
      await handleJobFailure(job);
    }
  }

  log(`🛑 Worker ${workerId} stopped.`);
}

function stopWorker() {
  stopSignal = true;
}

process.on('message', async (msg) => {
  if (!msg || !msg.cmd) return;

  if (msg.cmd === 'start') {
    const workerId = msg.workerId || 1;
    await startWorker(workerId);
  }

  if (msg.cmd === 'shutdown') {
    stopWorker();
  }
});

module.exports = { startWorker, stopWorker };
