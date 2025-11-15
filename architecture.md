# QueueCTL – Architecture Overview

## System Architecture Diagram

Below is the high-level architecture diagram showing the flow between user commands, CLI entrypoint, workers, database and job lifecycle.

![QueueCTL Architecture](./docs/hld.png)

QueueCTL uses:

SQLite as persistent storage
Child processes (fork) as workers
IPC messaging to manage workers
Node’s exec() to execute actual shell commands

2. Job Lifecycle

Every job flows through well-defined states:
Below is the diagram of job cycle flow
Queuectl job cycle(./docs/)

enqueue → pending
pending → processing
processing → (success → completed)
processing → (failure → failed → retry → pending)
(retry limit reached) → dead (DLQ)

States
| State        | Meaning                          |
| ------------ | -------------------------------- |
| `pending`    | Waiting to be picked by a worker |
| `processing` | Currently running                |
| `completed`  | Finished successfully            |
| `failed`     | Failed once, retry scheduled     |
| `dead`       | Exceeded retry limit (DLQ)       |


3. Worker Architecture

Each worker is a separate child process started via:
fork('src/workerChild.js')

Worker Responsibilities

1.Recover unfinished jobs
2.Claim one pending job using a SQLite lock
3.Run job command with exec()
4.Update the job state
5.Handle failures with exponential backoff
6.Move jobs to DLQ when retries are exhausted
7.Repeat the loop forever



4. Safe Job Fetching (SQLite Row Locking)

To prevent two workers from processing the same job, QueueCTL uses:

BEGIN IMMEDIATE;
SELECT job;
UPDATE job SET state='processing';
COMMIT;


This ensures:
-Only one worker can “lock” the row
-Others skip until they can acquire the lock
-No job duplication
-Perfect for multi-worker concurrency

5. Retry System (Exponential Backoff)

When a job fails:
delay = base ^ attempt * 1000 ms

Where:
        base default = 2

        attempt = current retry attempt

Example

        Attempt 1 → 2¹ = 2 seconds
        Attempt 2 → 2² = 4 seconds
        Attempt 3 → 2³ = 8 seconds

Workers do NOT block.
Retry is scheduled via setTimeout() → job becomes pending later.

This increases throughput.


6. Configuration System (Dynamic Runtime Config)

The config table stores:
| Key            | Example | Purpose          |
| -------------- | ------- | ---------------- |
| `max_retries`  | `3`     | Retry limit      |
| `backoff_base` | `2`     | Exponential base |

Commands:

queuectl config show
queuectl config set max_retries 5
queuectl config set backoff_base 3


Workers always read latest config values — no restart required.

Directory Structure (./docs/directory.png)
incase doesn't load 
queuectl/
│
├── bin/
│   └── queuectl.js      # CLI executable
│
├── src/
│   ├── index.js         # CLI router
│   ├── workerChild.js   # Worker process
│   ├── commands/        # CLI command handlers
│   └── lib/
│       ├── persistence.js
│       ├── jobManager.js
│       ├── config.js
│       ├── logger.js
│       └── utils/
│           └── backoff.js
│
└── tests/
    └── test_basic.ps1

Sequence Diagram

                User → queuectl → jobs table → workers → DLQ (if failed)
                                    ↓
                            config table (dynamic)
