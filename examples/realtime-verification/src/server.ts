import { open, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { OrbitEcho } from '@gravito/echo'
import { type BroadcastManager, OrbitRadiance } from '@gravito/radiance'
import { OrbitRipple } from '@gravito/ripple'
import { PlanetCore } from 'gravito-core'
import { FileSystemDriver } from './broadcaster'

const STORAGE_PATH = join(process.cwd(), 'storage/broadcast_log.jsonl')

export async function startServer(port: number, name: string) {
  console.log(`[${name}] Starting server on port ${port}...`)

  const core = new PlanetCore()

  // Install Echo for event system
  const echo = new OrbitEcho()
  await core.orbit(echo)

  // Install Ripple for WebSocket
  const rippleOrbit = new OrbitRipple({
    path: '/ws',
    authorizer: async () => true, // Allow all for demo
  })
  // We need to access core.install but OrbitRipple.install is void.
  // Wait, core.install() is how we usually install modules.
  // OrbitRipple implements install(core).
  // But I need the server instance.
  await core.orbit(rippleOrbit)
  const rippleServer = rippleOrbit.getServer()

  // Install Radiance for Broadcasting
  // We start with 'websocket' driver as placeholder, then swap it
  await core.orbit(
    new OrbitRadiance({
      driver: 'websocket',
      config: {},
    })
  )

  // Swap Driver
  const broadcastManager = core.services.get('broadcast') as BroadcastManager
  if (broadcastManager) {
    broadcastManager.setDriver(new FileSystemDriver())
    console.log(`[${name}] Swapped Radiance driver to FileSystemDriver`)
  } else {
    console.error(`[${name}] Failed to get BroadcastManager`)
  }

  // File Watcher (Redis Pub/Sub Simulator)
  let lastSize = 0
  try {
    const s = await stat(STORAGE_PATH)
    lastSize = s.size
  } catch {
    // File might not exist yet
  }

  // Simple polling loop for file changes
  setInterval(async () => {
    try {
      const s = await stat(STORAGE_PATH)
      if (s.size > lastSize) {
        const fileHandle = await open(STORAGE_PATH, 'r')
        const buffer = Buffer.alloc(s.size - lastSize)
        await fileHandle.read(buffer, 0, buffer.length, lastSize)
        await fileHandle.close()

        lastSize = s.size

        const lines = buffer
          .toString()
          .split('\n')
          .filter((l) => l.trim().length > 0)
        for (const line of lines) {
          try {
            const msg = JSON.parse(line)
            // { channel, type, event, data, timestamp }
            // console.log(`[${name}] Received broadcast via File:`, msg)

            // Forward to local WebSocket clients
            rippleServer.broadcast(msg.channel, msg.event, msg.data)
          } catch (e) {
            console.error(`[${name}] Error parsing broadcast line:`, e)
          }
        }
      }
    } catch (_e) {
      // ignore file not found errors initially
    }
  }, 100)

  // Start Bun Server
  Bun.serve({
    port,
    fetch: (req, server) => {
      // Upgrade to WebSocket
      if (rippleServer.upgrade(req, server)) {
        return undefined
      }

      // Simple HTTP endpoint to trigger broadcast via Echo/Radiance
      const url = new URL(req.url)
      if (url.pathname === '/trigger') {
        // Manually broadcast via Radiance
        // In real app, we would emit an Event
        const channel = url.searchParams.get('channel') || 'public-announcements'
        const message = url.searchParams.get('message') || 'Hello World'

        broadcastManager.broadcast(
          null,
          { name: channel, type: 'public' },
          { message, from: name },
          'emergency-alert'
        )

        return new Response('Broadcast triggered')
      }

      return new Response('Gravito Verification Server', { status: 200 })
    },
    websocket: rippleServer.getHandler(),
  })
}
