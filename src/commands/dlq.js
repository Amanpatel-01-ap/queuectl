// src/commands/dlq.js
const { db } = require('../lib/persistence');
const readline = require('readline');

function listDLQ(showTable = true) {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM jobs WHERE state='dead' ORDER BY created_at`, [], (err, rows) => {
      if (err) {
        console.error('Error reading DLQ:', err.message);
        return resolve([]);
      }

      if (showTable) {
        if (rows.length === 0) {
          console.log('✅ DLQ is empty.');
        } else {
          console.log('\n📌 Dead Letter Queue:');
          rows.forEach((job, index) => {
            console.log(`[${index}] ${job.id}  command="${job.command}"  attempts=${job.attempts}`);
          });
        }
      }

      resolve(rows);
    });
  });
}

function retryJobById(jobId) {
  db.run(
    `UPDATE jobs SET state='pending', attempts=0, updated_at=? WHERE id=? AND state='dead'`,
    [new Date().toISOString(), jobId],
    function (err) {
      if (err) return console.error('❌ Error retrying DLQ job:', err.message);

      if (this.changes === 0)
        console.log('⚠️ No job found in DLQ with that ID.');
      else
        console.log(`🔁 Job ${jobId} moved from DLQ → pending.`);
    }
  );
}

function retryDLQ(identifier) {
  // If no argument → show interactive menu
  if (!identifier) {
    return (async () => {
      const rows = await listDLQ();

      if (rows.length === 0) return;

      console.log(`\nSelect job to retry:`);
      console.log(`(number) retry that job`);
      console.log(`all      retry ALL\n`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question("Enter choice: ", (answer) => {
        rl.close();
        retryDLQ(answer.trim());
      });
    })();
  }

  // Retry ALL
  if (identifier === "all") {
    return db.all(`SELECT id FROM jobs WHERE state='dead'`, [], (err, rows) => {
      if (err) return console.error('❌ Error:', err.message);
      if (rows.length === 0) return console.log("DLQ empty.");

      rows.forEach(row => retryJobById(row.id));
    });
  }

  // Retry by index
  if (/^\d+$/.test(identifier)) {
    const index = parseInt(identifier);
    return db.all(`SELECT id FROM jobs WHERE state='dead' ORDER BY created_at`, [], (err, rows) => {
      if (err) return console.error('❌ Error:', err.message);
      if (index < 0 || index >= rows.length) return console.log(`⚠️ Invalid index: ${index}`);

      retryJobById(rows[index].id);
    });
  }

  // Retry by actual jobId
  retryJobById(identifier);
}

module.exports = { listDLQ, retryDLQ };
