import { QuasarAgent } from '@gravito/quasar'

/**
 * Remote Control Example
 *
 * This example demonstrates how to enable the Remote Control feature,
 * allowing you to retry or delete jobs from the Zenith dashboard.
 */
async function run() {
  const agent = new QuasarAgent({
    service: 'worker-node',
    transport: { url: 'redis://localhost:6379' },
    monitor: { url: 'redis://localhost:6379' }, // Required for remote control commands
  })

  // 1. Start the agent first
  await agent.start()

  // 2. Enable remote control (must be called after start)
  const enabled = await agent.enableRemoteControl()

  if (enabled) {
    const nodeId = agent.getNodeId()
    console.log(`🎮 Remote control enabled for node: ${nodeId}`)
    console.log(`You can now manage queues for this service from Zenith console.`)
  } else {
    console.error('❌ Failed to enable remote control. Check logs for details.')
  }
}

run().catch(console.error)
