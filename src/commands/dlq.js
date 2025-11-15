const { db } = require('../lib/persistence');

function listDLQ() {
  db.all(`SELECT * FROM jobs WHERE state='dead'`, [], (err, rows) => {
    if (err) return console.error('Error reading DLQ:', err.message);

    if (rows.length === 0) {
      console.log('✅ DLQ is empty.');
      return;
    }

    // Show with index
    rows.forEach((job, index) => {
      console.log(`[${index}] ${job.id}  command="${job.command}"  attempts=${job.attempts}`);
    });
  });
}

function retryDLQ(identifier) {
  // identifier can be a jobId OR an index number
  const isIndex = /^\d+$/.test(identifier);

  if (isIndex) {
    const index = parseInt(identifier);

    db.all(`SELECT id FROM jobs WHERE state='dead' ORDER BY created_at`, [], (err, rows) => {
      if (err) return console.error('❌ Error:', err.message);

      if (index < 0 || index >= rows.length) {
        console.log(`⚠️ Invalid index: ${index}`);
        return;
      }

      const jobId = rows[index].id;

      db.run(
        `UPDATE jobs SET state='pending', attempts=0, updated_at=? WHERE id=?`,
        [new Date().toISOString(), jobId],
        function (err) {
          if (err) return console.error('❌ Error retrying DLQ job:', err.message);
          console.log(`🔁 Job ${jobId} (index ${index}) moved from DLQ → pending.`);
        }
      );
    });

  } else {
    // Retry by actual job ID fallback
    db.run(
      `UPDATE jobs SET state='pending', attempts=0, updated_at=? WHERE id=? AND state='dead'`,
      [new Date().toISOString(), identifier],
      function (err) {
        if (err) return console.error('❌ Error retrying DLQ job:', err.message);

        if (this.changes === 0)
          console.log('⚠️ No job found in DLQ with that ID.');
        else
          console.log(`🔁 Job ${identifier} moved from DLQ → pending.`);
      }
    );
  }
}

module.exports = { listDLQ, retryDLQ };
