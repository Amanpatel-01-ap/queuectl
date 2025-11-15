// src/lib/workerManager.js
const { fork } = require('child_process');
const path = require('path');
const { log } = require('./logger');   // ✅ use logger for system logs

const children = new Map(); // key: workerId, value: { proc, shutdownTimer }
let shuttingDown = false;

/**
 * Start one worker process.
 */
function startWorker(workerId) {
  if (shuttingDown) {
    log(`⚠️  Not starting worker ${workerId}: manager is shutting down.`);
    return;
  }

  // Path to workerChild.js
  const workerPath = path.join(__dirname, '..', 'workerChild.js');

  const child = fork(workerPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  // Save child reference
  children.set(workerId, { proc: child, shutdownTimer: null });

  log(`🔹 Spawned worker ${workerId} (pid: ${child.pid})`);

  // Forward child stdout
  if (child.stdout) {
    child.stdout.on('data', (b) => {
      process.stdout.write(`[worker ${workerId} stdout] ${b}`);
    });
  }

  // Forward child stderr
  if (child.stderr) {
    child.stderr.on('data', (b) => {
      process.stderr.write(`[worker ${workerId} stderr] ${b}`);
    });
  }

  // IPC messages from worker
  child.on('message', (msg) => {
    if (msg && msg.type) {
      log(`[worker ${workerId}] message: ${JSON.stringify(msg)}`);
    }
  });

  // Worker exit
  child.on('exit', (code, signal) => {
    log(`🔸 Worker ${workerId} exited (code=${code}, signal=${signal})`);
    children.delete(workerId);
  });

  // Worker error
  child.on('error', (err) => {
    console.error(`❌ Worker ${workerId} error:`, err);
  });

  // Send start signal
  child.send({ cmd: 'start', workerId });

  return child;
}

/**
 * Stop all workers gracefully.
 */
function stopWorker() {
  if (shuttingDown) {
    log('ℹ️  Stop already in progress.');
    return Promise.resolve();
  }
  shuttingDown = true;

  log(`🛑 Stopping ${children.size} worker(s) gracefully...`);

  const stopPromises = [];

  for (const [workerId, meta] of children.entries()) {
    const { proc } = meta;

    stopPromises.push(
      new Promise((resolve) => {
        if (!proc || proc.killed) return resolve();

        try {
          proc.send({ cmd: 'shutdown' });
        } catch (_) {}

        const cleanup = () => {
          clearTimeout(meta.shutdownTimer);
          resolve();
        };

        proc.once('exit', cleanup);

        // SIGTERM after 8 seconds
        meta.shutdownTimer = setTimeout(() => {
          if (!proc.killed) {
            try {
              proc.kill('SIGTERM');
            } catch (_) {}
          }
        }, 8000);

        // SIGKILL after 12 seconds
        setTimeout(() => {
          if (!proc.killed) {
            try {
              proc.kill('SIGKILL');
            } catch (_) {}
          }
        }, 12000);
      })
    );
  }

  return Promise.all(stopPromises).then(() => {
    log('✔ All worker processes stopped.');
  });
}

function listWorkers() {
  return Array.from(children.keys());
}

module.exports = {
  startWorker,
  stopWorker,
  listWorkers,
};
