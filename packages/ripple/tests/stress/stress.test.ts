import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanupTestServer, createTestServer, type TestServerSetup } from '../helpers'

describe('Stress Tests', () => {
  let setup: TestServerSetup

  beforeEach(async () => {
    setup = await createTestServer({
      authorizer: (channel, userId, socketId) => {
        if (channel.startsWith('presence-')) {
          return {
            id: userId ?? socketId,
            info: { name: `User-${socketId.slice(0, 4)}` },
          }
        }
        if (channel.startsWith('private-')) {
          return userId !== undefined
        }
        return true
      },
    })
  })

  afterEach(async () => {
    await cleanupTestServer(setup)
  })

  describe('Concurrent Connections', () => {
    it('should handle 100 concurrent connections', async () => {
      const connectionCount = 100
      const connections: WebSocket[] = []
      const connectedCount = { value: 0 }

      await new Promise<void>((resolve) => {
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
          connections.push(ws)

          ws.onopen = () => {
            connectedCount.value++
            if (connectedCount.value === connectionCount) {
              resolve()
            }
          }
        }
      })

      expect(connectedCount.value).toBe(connectionCount)

      for (const ws of connections) ws.close()
      await new Promise((resolve) => setTimeout(resolve, 100))
    }, 10000)

    it('should handle 50 connections with subscriptions', async () => {
      const connectionCount = 50
      const connections: WebSocket[] = []
      const subscribed = { count: 0 }

      await new Promise<void>((resolve) => {
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
          connections.push(ws)

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel: `channel-${i % 10}` }))
          }

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data.toString())
            if (msg.type === 'subscribed') {
              subscribed.count++
              if (subscribed.count === connectionCount) {
                resolve()
              }
            }
          }
        }
      })

      expect(subscribed.count).toBe(connectionCount)

      for (const ws of connections) ws.close()
    }, 10000)
  })

  describe('Rapid Subscribe/Unsubscribe', () => {
    it('should handle rapid subscribe/unsubscribe cycles', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const operations = 100
      let completedOps = 0

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          for (let i = 0; i < operations; i++) {
            ws.send(JSON.stringify({ type: 'subscribe', channel: `rapid-${i}` }))
            ws.send(JSON.stringify({ type: 'unsubscribe', channel: `rapid-${i}` }))
          }
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          if (msg.type === 'subscribed' || msg.type === 'unsubscribed') {
            completedOps++
            if (completedOps === operations * 2) {
              resolve()
            }
          }
        }
      })

      expect(completedOps).toBe(operations * 2)

      ws.close()
    }, 10000)

    it('should handle multiple clients rapidly subscribing to same channel', async () => {
      const clientCount = 50
      const channel = 'shared-rapid'
      const clients: WebSocket[] = []
      let subscribed = 0

      await new Promise<void>((resolve) => {
        for (let i = 0; i < clientCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
          clients.push(ws)

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel }))
          }

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data.toString())
            if (msg.type === 'subscribed' && msg.channel === channel) {
              subscribed++
              if (subscribed === clientCount) {
                resolve()
              }
            }
          }
        }
      })

      expect(subscribed).toBe(clientCount)

      for (const ws of clients) ws.close()
    }, 10000)
  })

  describe('High Throughput Broadcasting', () => {
    it('should handle 1000 rapid broadcasts', async () => {
      const messageCount = 1000
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      let receivedCount = 0

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'throughput-test' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())

          if (msg.type === 'subscribed') {
            for (let i = 0; i < messageCount; i++) {
              setup.server.broadcast('throughput-test', `Event${i}`, { index: i })
            }
          }

          if (msg.type === 'event') {
            receivedCount++
            if (receivedCount === messageCount) {
              resolve()
            }
          }
        }
      })

      expect(receivedCount).toBe(messageCount)

      ws.close()
    }, 15000)

    it('should broadcast to 50 subscribers efficiently', async () => {
      const subscriberCount = 50
      const messageCount = 100
      const subscribers: WebSocket[] = []
      const receivedCounts = new Array(subscriberCount).fill(0)
      let readyCount = 0

      await new Promise<void>((resolve) => {
        for (let i = 0; i < subscriberCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
          const index = i
          subscribers.push(ws)

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))
          }

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data.toString())

            if (msg.type === 'subscribed') {
              readyCount++
              if (readyCount === subscriberCount) {
                for (let j = 0; j < messageCount; j++) {
                  setup.server.broadcast('broadcast-test', `BulkEvent${j}`, { index: j })
                }
              }
            }

            if (msg.type === 'event') {
              receivedCounts[index]++
              if (receivedCounts.every((count) => count === messageCount)) {
                resolve()
              }
            }
          }
        }
      })

      receivedCounts.forEach((count) => {
        expect(count).toBe(messageCount)
      })

      for (const ws of subscribers) ws.close()
    }, 15000)
  })

  describe('Presence Channel Stress', () => {
    it('should handle 30 users joining presence channel simultaneously', async () => {
      const userCount = 30
      const clients: WebSocket[] = []
      let joinedCount = 0

      await new Promise<void>((resolve) => {
        for (let i = 0; i < userCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws?userId=user-${i}`)
          clients.push(ws)

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel: 'presence-stress' }))
          }

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data.toString())
            if (msg.type === 'presence' && msg.event === 'members') {
              joinedCount++
              if (joinedCount === userCount) {
                resolve()
              }
            }
          }
        }
      })

      expect(joinedCount).toBe(userCount)

      for (const ws of clients) ws.close()
    }, 10000)
  })

  describe('Memory Leak Prevention', () => {
    it('should clean up disconnected clients properly', async () => {
      const cycles = 10
      const clientsPerCycle = 20

      for (let cycle = 0; cycle < cycles; cycle++) {
        const clients: WebSocket[] = []

        for (let i = 0; i < clientsPerCycle; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
          clients.push(ws)

          await new Promise<void>((resolve) => {
            ws.onopen = () => {
              ws.send(JSON.stringify({ type: 'subscribe', channel: `cycle-${cycle}` }))
              resolve()
            }
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 50))

        for (const ws of clients) ws.close()
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }, 20000)
  })

  describe('Mixed Operations Under Load', () => {
    it('should handle mixed operations from 30 concurrent clients', async () => {
      const clientCount = 30
      const operationsPerClient = 20
      const clients: WebSocket[] = []
      const completedOperations: number[] = new Array(clientCount).fill(0)

      await new Promise<void>((resolve) => {
        for (let i = 0; i < clientCount; i++) {
          const ws = new WebSocket(`ws://localhost:${setup.port}/ws?userId=mix-user-${i}`)
          const clientIndex = i
          clients.push(ws)

          ws.onopen = () => {
            for (let op = 0; op < operationsPerClient; op++) {
              if (op % 3 === 0) {
                ws.send(JSON.stringify({ type: 'subscribe', channel: `mix-${op}` }))
              } else if (op % 3 === 1) {
                ws.send(JSON.stringify({ type: 'unsubscribe', channel: `mix-${op - 1}` }))
              } else {
                ws.send(
                  JSON.stringify({
                    type: 'whisper',
                    channel: 'mix-0',
                    event: 'TestWhisper',
                    data: { from: clientIndex },
                  })
                )
              }
            }
          }

          ws.onmessage = () => {
            completedOperations[clientIndex]++
            if (completedOperations.every((count) => count >= operationsPerClient)) {
              resolve()
            }
          }
        }
      })

      for (const ws of clients) ws.close()
    }, 15000)
  })
})
