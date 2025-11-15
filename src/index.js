const { Command } = require('commander');
const enqueue = require('./commands/enqueue');
const listJobs = require('./commands/list');
const status = require('./commands/status');
const { start, stop } = require('./commands/worker');
const { listDLQ, retryDLQ } = require('./commands/dlq');
const configCmd = require('./commands/config');

const program = new Command();

program
  .name('queuectl')
  .description('CLI Job Queue Manager')
  .version('1.0.0');

program
  .command('enqueue <jobJson>')
  .description('Add a new job to the queue')
  .action(enqueue);

const dlq = program
  .command('dlq')
  .description('Dead Letter Queue');

dlq.command('list')
  .description('List dead jobs')
  .action(() => listDLQ());

dlq.command('retry [identifier]')
  .description('Retry a DLQ job (index, jobId, or "all")')
  .action(retryDLQ);

const config = program
  .command('config')
  .description('Configuration settings');

config
  .command('show')
  .description('Show current configuration')
  .action(configCmd.show);
config
  .command('set <key> <value>')
  .description('Update configuration value')
  .action(configCmd.set);

const worker = program
  .command('worker')
  .description('Manage workers');

worker.command('start')
  .option('--count <number>', 'Number of workers', '1')
  .action(start);

worker
  .command('stop')
  .description('Stop workers')
  .action(stop);

program
  .command('status')
  .description('Show summary of job states')
  .action(status);

program.command('list')
  .option('--state <state>', 'Filter jobs by state')
  .action(listJobs);

program.parse(process.argv);
