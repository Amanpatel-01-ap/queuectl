const { startWorker, stopWorker } = require('../lib/workerManager');

async function start(options) {
  const count = parseInt(options.count || '1');
  console.log(`🚀 Starting ${count} worker(s)...`);

  for (let i = 1; i <= count; i++) {
    startWorker(i);
  }


  console.log("Workers running... Press CTRL+C to stop.\n");

  // Keep the CLI alive
  setInterval(() => {}, 1 << 30);
}

async function stop() {
  console.log("🛑 Worker stop command received.");
  await stopWorker();
}

module.exports = { start, stop };
