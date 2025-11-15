Write-Host "🧪 Starting QueueCTL test flow..."

# Clean old DB
Write-Host "🧱 Cleaning old jobs..."
Remove-Item -Force db/jobs.sqlite -ErrorAction SilentlyContinue

# Enqueue jobs
Write-Host "✅ Enqueuing jobs..."
queuectl enqueue '{"command":"echo Hello"}'
queuectl enqueue '{"command":"sleep 2"}'
queuectl enqueue '{"command":"exit 1"}'

Write-Host "📊 Current jobs:"
queuectl list

# Start workers (background)
Write-Host "🚀 Starting workers..."
Start-Process -NoNewWindow powershell -ArgumentList "queuectl worker start --count 2"

Start-Sleep -Seconds 8

Write-Host "🧾 Status after processing:"
queuectl status

Write-Host "☠️ DLQ contents:"
queuectl dlq list

Write-Host "🔁 Retrying DLQ job..."

# SAFE WINDOWS QUERY
$jobid = node ./tests/get_dlq_id.js

if ($jobid) {
    queuectl dlq retry $jobid
    Write-Host "Requeued job: $jobid"
}

Start-Sleep -Seconds 4

queuectl status

Write-Host "✅ Test completed successfully!"
