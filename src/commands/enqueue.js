const { addJob } = require('../lib/jobManager');
const { log } = require('../lib/logger');   

async function enqueue(input) {
  try {
    let jobData;

    // Try parsing JSON
    try {
      jobData = JSON.parse(input);
    } catch (parseErr) {
      // Not valid JSON — treat input as plain command string
      jobData = { command: input.trim() };
    }

    // Validate the job command
    if (!jobData.command || typeof jobData.command !== 'string') {
      console.error('❌ Invalid job: missing "command" field or not a string.');
      process.exit(1);
    }

    // Add job to database
    const job = await addJob(jobData);

    // Log success using logger
    log(`✅ Job ${job.id} enqueued successfully.`);

  } catch (err) {
    console.error('❌ Error enqueuing job:', err.message);
  }
}

module.exports = enqueue;
