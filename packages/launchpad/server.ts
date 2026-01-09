import { getRuntimeAdapter } from '@gravito/core'
import { bootstrapLaunchpad } from './src/index'

const config = await bootstrapLaunchpad()
const runtime = getRuntimeAdapter()
runtime.serve(config)

console.log(`🚀 Launchpad Command Center active at: http://localhost:${config.port}`)
console.log(`📡 Telemetry WebSocket channel: ws://localhost:${config.port}/ws`)
