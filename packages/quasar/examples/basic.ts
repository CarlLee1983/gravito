import { QuasarAgent } from '../src'

async function main() {
  const agent = new QuasarAgent({
    service: 'example-service',
    transport: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  })

  agent.monitorQueue('emails', 'redis')

  await agent.start()
  console.log('Agent started. Press Ctrl+C to stop.')

  await agent.enableRemoteControl()

  const cleanup = async () => {
    await agent.stop()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

if (import.meta.main) {
  main()
}
