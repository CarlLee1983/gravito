import { QuasarAgent } from '@gravito/quasar'
import { Queue, Worker } from 'bullmq'

/**
 * BullMQ Monitoring Example
 *
 * This example demonstrates how to monitor BullMQ queue statistics
 * and track real-time job execution logs using Quasar.
 */
async function run() {
  const agent = new QuasarAgent({
    service: 'bullmq-service',
    transport: { url: 'redis://localhost:6379' },
    monitor: { url: 'redis://localhost:6379' },
  })

  // 1. Monitor queue statistics (Waiting, Active, Delayed, Failed counts)
  agent.monitorQueue('video-processing', 'bullmq')

  // 2. Setup a real BullMQ worker
  const queue = new Queue('video-processing')
  const worker = new Worker('video-processing', async (job) => {
    console.log(`Processing video: ${job.id}`)

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (Math.random() > 0.8) {
      throw new Error('Random processing failure')
    }

    return { status: 'completed' }
  })

  // 3. Attach bridge for real-time job tracking
  // This will send logs to Zenith whenever a job starts, completes, or fails.
  agent.attachBridge(worker, 'bullmq')

  await agent.start()
  console.log('Quasar agent started with BullMQ monitoring')

  // Add some test jobs
  setInterval(async () => {
    await queue.add('process', { file: 'video.mp4' })
  }, 5000)
}

run().catch(console.error)
