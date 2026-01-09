import { Consumer } from '@gravito/stream'
import { env } from '../env'
import { getQueueManager } from '../stream'

export async function startAllConsumers() {
  const queueManager = await getQueueManager()

  // Read concurrency from ENV, default to 1 (Development default)
  const CONCURRENCY = parseInt(process.env.CONCURRENCY || '1', 10)

  console.log(`🚀 Starting @gravito/stream Consumer Service`)
  console.log(`   - Driver: ${env.queueDriver}`)
  console.log(`   - Concurrency: ${CONCURRENCY} workers`)
  console.log(`   - Queues: [${env.rabbitQueue}]`)

  const consumers: Consumer[] = []

  for (let i = 0; i < CONCURRENCY; i++) {
    const consumer = new Consumer(queueManager, {
      queues: [env.rabbitQueue],
      pollInterval: 100, // Faster polling for high throughput
      workerOptions: {
        maxAttempts: 3,
      },
    })
    consumers.push(consumer)
  }

  // Start all consumers in parallel
  // Note: In Node.js non-blocking I/O, this works perfectly fine in a single process
  await Promise.all(consumers.map((c) => c.start()))

  console.log(`✅ All ${CONCURRENCY} consumers start working.`)

  const shutdown = async () => {
    console.log('\nShutting down consumers...')
    await Promise.all(consumers.map((c) => c.stop()))
    console.log('Bye.')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
