# QueueCTL – CLI Job Queue Manager

QueueCTL is a lightweight **command-line job queue system** built with **Node.js + SQLite**.  
It supports job scheduling, multiple workers, retries with exponential backoff, configuration management, crash-recovery, and a Dead Letter Queue (DLQ).

This project demonstrates how real-world queue systems (BullMQ, Celery, Sidekiq) work internally.

---
## 🎥 CLI Demo Video

Watch the working QueueCTL demo:

🔗 **Demo Video**: https://drive.google.com/file/d/1Z5Zls1dE3sgmMSoaQ3NPxgNkl2wb9z70/view?usp=sharing


# 🛠️ Setup Instructions

## 📥 Install dependencies

npm install


## 🔗 Link CLI globally
npm link


Now the command `queuectl` is available anywhere:

queuectl --help


## 💾 Database
A SQLite file is automatically created here:

db/jobs.sqlite


No setup needed.

---

# 🚀 Usage Examples

## ▶️ Enqueue jobs

queuectl enqueue "echo Hello"
queuectl enqueue '{"command":"sleep 2"}'
queuectl enqueue '{"command":"exit 1"}'


## ▶️ Start workers


queuectl worker start --count 2


## ✋ Stop all workers


queuectl worker stop


## 📋 List jobs


queuectl list
queuectl list --state pending
queuectl list --state dead


## 📊 Queue status


queuectl status


---

# ☠️ Dead Letter Queue (DLQ)

Jobs that keep failing go into DLQ.

Dead Letter Queue (DLQ)

Jobs that continue to fail after passing the retry limit are moved to the DLQ (Dead Letter Queue).

 List DLQ jobs
queuectl dlq list


Shows all dead jobs with an index number:

[0] 91af...  command="exit 1"  attempts=3
[1] a83d...  command="sleep 5" attempts=3

🔁 Retrying DLQ Jobs

QueueCTL supports 4 retry modes:

1️ Retry by Job ID
queuectl dlq retry <jobId>


Example:

queuectl dlq retry 91af-1234-...

2️ Retry by Index

Use the index shown in dlq list:

queuectl dlq retry 0

3️ Retry ALL DLQ jobs
queuectl dlq retry all


Moves every dead job back to pending.

4️ Interactive Mode (no argument)
queuectl dlq retry


CLI will ask:

[0] job1...
[1] job2...

Select job to retry:
(number / all)

Just type, for example:
            0
            or
            all
 Example Flow
        queuectl dlq list
        queuectl dlq retry
# choose: 1
Output:

        Job <id> moved from DLQ → pending.


---

# ⚙️ Configuration (Dynamic)

QueueCTL lets you change retry/backoff behavior at runtime.

### Show config

queuectl config show


### Set values


queuectl config set max_retries 5
queuectl config set backoff_base 3


Workers will automatically use updated values.

---

# 🧠 Architecture Overview

## 1️⃣ Job Lifecycle



enqueue
→ pending
→ processing
→ success → completed
→ failure → retry (exponential backoff)
↓
dead (DLQ)


---

## 2️⃣ Worker Logic

Each worker process:
1. Recovers jobs stuck in `processing`
2. Fetches one pending job using **SQLite row locking**
3. Executes the command
4. Updates status: completed / failed
5. Retries via **non-blocking exponential backoff**
6. Moves permanently failing jobs to DLQ
7. Continues loop until stopped

Multiple workers run safely in parallel.

---

## 3️⃣ Data Storage (SQLite)

### **jobs table**
| Column      | Description                                      |
| ----------- | ------------------------------------------------ |
| id          | UUID                                             |
| command     | Shell command                                    |
| state       | pending / processing / completed / failed / dead |
| attempts    | Retry count                                      |
| max_retries | Per-job retry limit                              |
| created_at  | Timestamp                                        |
| updated_at  | Timestamp                                        |


### **config table**
Stores dynamic runtime configuration:
- `max_retries`
- `backoff_base`

---

## 4️⃣ Dead Letter Queue (DLQ)

A job goes to `state = 'dead'` when:

attempts >= max_retries

You can manually retry it:

queuectl dlq retry <jobId>


---

## 5️⃣ Crash Recovery

If a worker crashes mid-job, next startup runs:

UPDATE jobs SET state='pending' WHERE state='processing'


So no job gets stuck.

---

# ⚖️ Assumptions & Trade-offs

✔ SQLite chosen for simplicity  
✔ Workers use child processes (similar to real queues)  
✔ Commands executed via `exec` shell  
✔ FIFO ordering by `created_at`  
✔ Non-blocking retry (workers stay free)  

---

# 🧪 Testing Instructions

A full automated test is included.

### Run test script on Windows PowerShell:


powershell -ExecutionPolicy Bypass ./tests/test_basic.ps1


The test covers:

✔ Clean DB  
✔ Enqueue jobs  
✔ Worker processing  
✔ Failure + retry  
✔ DLQ movement  
✔ Retry DLQ job  
✔ Final status  

Expected output:


Test completed successfully!


---

# ✅ Project Complete

This project now includes:

- ✔ Fully working CLI  
- ✔ Multi-worker system  
- ✔ Crash recovery  
- ✔ Exponential backoff  
- ✔ DLQ support  
- ✔ Config system  
- ✔ Logging  
- ✔ Automated tests  
- ✔ Full documentation  