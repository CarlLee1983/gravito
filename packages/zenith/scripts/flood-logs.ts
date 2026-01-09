import { QueueService } from '../src/server/services/QueueService'

const svc = new QueueService(process.env.REDIS_URL || 'redis://localhost:6379')
await svc.connect()

console.log('🌊 Flooding 500 logs in burst...')
const start = Date.now()
const promises = []
for (let i = 0; i < 500; i++) {
  promises.push(
    svc.publishLog({
      level: 'info',
      message: `Flood log ${i} - ${Date.now()}`,
      workerId: 'flood-bot',
      queue: 'test-flood',
    })
  )
}
await Promise.all(promises)
console.log(`✅ Sent 500 logs in ${Date.now() - start}ms`)
process.exit(0)
