/**
 * Ripple v5.0 Multi-Runtime Example
 *
 * Demonstrates the new engine-based architecture with the simplified start() API.
 * This example works on Bun (default), Node.js with uWebSockets.js, or Node.js with ws.
 */

import { RippleServer } from '../src'

// Create a Ripple server with the new v5.0 API
const ripple = new RippleServer({
  // Port to listen on
  port: 3000,

  // Runtime selection (optional - auto-detects if not specified)
  // runtime: 'bun',        // Use Bun native WebSocket (default on Bun)
  // runtime: 'node-uws',   // Use uWebSockets.js on Node.js (high performance)
  // runtime: 'node-ws',    // Use ws package on Node.js (best compatibility)

  // Channel authorizer
  authorizer: async (channel, userId, socketId) => {
    console.log(`Authorization request: ${channel} for user ${userId}`)

    // Public channels - allow all
    if (!channel.startsWith('private-') && !channel.startsWith('presence-')) {
      return true
    }

    // Private channels - require authentication
    if (channel.startsWith('private-')) {
      return userId !== undefined
    }

    // Presence channels - return user info
    if (channel.startsWith('presence-')) {
      if (!userId) return false

      return {
        id: userId,
        info: {
          name: `User ${userId}`,
          status: 'online',
        },
      }
    }

    return false
  },

  // Optional: Use Redis for multi-server scaling
  // driver: 'redis',
  // redis: {
  //   host: 'localhost',
  //   port: 6379,
  // },

  // Optional: Use NATS for multi-server scaling
  // driver: 'nats',
  // nats: {
  //   servers: ['nats://localhost:4222'],
  // },

  // Optional: Enable Protobuf serialization
  // serializer: 'protobuf',

  // Optional: Enable metrics
  metrics: {
    enabled: true,
    prefix: 'ripple',
  },

  // Optional: Enable reconnection support
  reconnection: {
    enabled: true,
    sessionTTL: 60000, // 1 minute
  },

  // Logging
  logLevel: 'info',
})

// Add custom event listeners
ripple.on('whisper', (socket, data) => {
  console.log(`Whisper from ${socket.id}:`, data)
})

// Start the server (new in v5.0!)
await ripple.start()

console.log('✅ Ripple v5.0 server started!')
console.log('📡 WebSocket endpoint: ws://localhost:3000/ws')
console.log('📊 Metrics endpoint: http://localhost:3000/metrics')
console.log('🏥 Health endpoint: http://localhost:3000/health')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  await ripple.shutdown()
  process.exit(0)
})

// Example: Broadcasting to a channel from the server
setInterval(() => {
  ripple.to('news').emit('server-time', {
    timestamp: Date.now(),
    message: 'Server is running!',
  })
}, 5000)
