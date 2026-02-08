/**
 * Ripple v4.0 Feature Demo
 *
 * This example demonstrates:
 * 1. NATS Driver configuration
 * 2. Server-side Message Interceptors (Middleware)
 * 3. Client-side Interceptors
 * 4. ACK confirmation mechanism
 * 5. Session recovery after reconnection
 *
 * Prerequisites:
 * - Install NATS server: `brew install nats-server` or `docker run -p 4222:4222 nats`
 * - Run NATS: `nats-server` or use LocalDriver for testing
 *
 * Usage:
 * bun run examples/v4-feature-demo.ts
 */

import { RippleServer } from '../src/RippleServer'

console.log('🌊 Ripple v4.0 Feature Demo\n')

// ─────────────────────────────────────────────────────────────
// 1. Setup Server with Interceptors
// ─────────────────────────────────────────────────────────────

const server = new RippleServer({
  // Use 'local' for demo (no NATS required)
  // Change to 'nats' if you have NATS server running
  driver: 'local',

  // Uncomment to use NATS:
  // driver: 'nats',
  // nats: {
  //   servers: 'nats://localhost:4222',
  // },

  // Enable reconnection support
  reconnection: {
    enabled: true,
    sessionTTL: 60000,
    maxSessions: 1000,
  },

  // Server-side Interceptors
  interceptors: [
    // 1. Logging Interceptor
    async (ctx, next) => {
      const msgType = ctx.message.type
      console.log(`[Server Interceptor] ${ctx.direction.toUpperCase()} - ${msgType}`)

      const start = Date.now()
      await next()

      const duration = Date.now() - start
      console.log(`[Server Interceptor] Processed ${msgType} in ${duration}ms`)
    },

    // 2. Data Masking Interceptor (Security)
    async (ctx, next) => {
      if (ctx.direction === 'outgoing' && ctx.message.type === 'event') {
        const msg = ctx.message as any

        // Mask sensitive fields
        if (msg.data?.password) {
          msg.data.password = '********'
          console.log('[Server Interceptor] 🔒 Masked sensitive data')
        }

        if (msg.data?.creditCard) {
          msg.data.creditCard = `****-****-****-${msg.data.creditCard.slice(-4)}`
          console.log('[Server Interceptor] 🔒 Masked credit card')
        }
      }
      await next()
    },

    // 3. Rate Limiting Interceptor (Optional)
    async (_ctx, next) => {
      // You can add rate limiting logic here
      // For now, just pass through
      await next()
    },
  ],

  // Authorization callback
  authorizer: async (channel, userId, _socketId) => {
    console.log(`[Authorizer] Checking access for channel: ${channel}`)

    if (channel.startsWith('private-')) {
      // Require authentication for private channels
      return userId !== undefined
    }

    if (channel.startsWith('presence-')) {
      // Return user info for presence channels
      return {
        id: userId || 'guest',
        info: {
          name: `User ${userId}`,
          joinedAt: new Date().toISOString(),
        },
      }
    }

    return true
  },
})

// ─────────────────────────────────────────────────────────────
// 2. Start WebSocket Server
// ─────────────────────────────────────────────────────────────

const PORT = 3456

Bun.serve({
  port: PORT,
  fetch(req, bunServer) {
    // Handle WebSocket upgrade
    if (server.upgrade(req, bunServer)) {
      return // Handled by WebSocket
    }

    // Handle regular HTTP requests
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', driver: server.driverName }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Ripple v4.0 Demo Server', { status: 200 })
  },
  websocket: server.getHandler(),
})

console.log(`✅ Server started on http://localhost:${PORT}`)
console.log(`✅ WebSocket endpoint: ws://localhost:${PORT}\n`)

// ─────────────────────────────────────────────────────────────
// 3. Event Listeners
// ─────────────────────────────────────────────────────────────

server.on('connection', (ws) => {
  console.log(`🔌 Client connected: ${ws.data.id}`)
})

server.on('disconnect', (ws) => {
  console.log(`❌ Client disconnected: ${ws.data.id}`)
})

server.on('subscribe', (ws, { channel }) => {
  console.log(`📡 Client ${ws.data.id} subscribed to ${channel}`)
})

server.on('unsubscribe', (ws, { channel }) => {
  console.log(`📴 Client ${ws.data.id} unsubscribed from ${channel}`)
})

// ─────────────────────────────────────────────────────────────
// 4. Demo: Broadcast Messages
// ─────────────────────────────────────────────────────────────

// Broadcast a message every 5 seconds
setInterval(() => {
  const timestamp = new Date().toLocaleTimeString()

  // Regular message
  server.to('news').emit('update', {
    title: 'Breaking News',
    content: `Server time: ${timestamp}`,
    timestamp,
  })

  console.log(`📢 Broadcasted to 'news' channel at ${timestamp}`)
}, 5000)

// Broadcast with ACK every 10 seconds
setInterval(() => {
  server.to('orders').emit(
    'status-update',
    {
      orderId: `ORD-${Math.floor(Math.random() * 1000)}`,
      status: 'shipped',
    },
    { needAck: true } // Request acknowledgment
  )

  console.log('📨 Sent ACK-required message to "orders" channel')
}, 10000)

// Broadcast sensitive data (will be masked by interceptor)
setTimeout(() => {
  server.to('admin').emit('user-data', {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'super_secret_123', // Will be masked
    creditCard: '4532-1234-5678-9010', // Will be masked
  })

  console.log('🔐 Sent sensitive data (should be masked by interceptor)')
}, 3000)

// ─────────────────────────────────────────────────────────────
// 5. Graceful Shutdown
// ─────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await server.shutdown()
  console.log('✅ Server shut down')
  process.exit(0)
})

// ─────────────────────────────────────────────────────────────
// 6. Client Example (Optional)
// ─────────────────────────────────────────────────────────────

console.log('\n📝 To test with a client, run this in your browser console:')
console.log(`
const ws = new WebSocket('ws://localhost:${PORT}')

ws.onopen = () => {
  console.log('Connected!')
  
  // Subscribe to news channel
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'news' }))
  
  // Subscribe to orders channel
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'orders' }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log('Received:', message)
  
  // Send ACK if needed
  if (message.needAck && message.seq !== undefined) {
    ws.send(JSON.stringify({ type: 'ack', seq: message.seq }))
    console.log('Sent ACK for seq:', message.seq)
  }
}

ws.onclose = () => console.log('Disconnected')
`)

console.log('\n🎯 Features demonstrated:')
console.log('  ✓ Server-side interceptors (logging, data masking)')
console.log('  ✓ Channel subscriptions and broadcasts')
console.log('  ✓ ACK confirmation mechanism')
console.log('  ✓ Reconnection support')
console.log('  ✓ Authorization callbacks')
console.log('\n⌛ Server is running... Press Ctrl+C to stop\n')
