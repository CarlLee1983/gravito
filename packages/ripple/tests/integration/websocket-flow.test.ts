import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { ChannelAuthorizer, PresenceUserInfo } from '../../src/types'
import { cleanupTestServer, createTestServer, type TestServerSetup } from '../helpers'

describe('WebSocket Integration Tests', () => {
  let setup: TestServerSetup

  beforeEach(async () => {
    setup = await createTestServer({
      authorizer: (channel, userId, socketId) => {
        if (channel.startsWith('presence-')) {
          return {
            id: userId ?? socketId,
            info: { name: `User-${socketId.slice(0, 4)}` },
          } as PresenceUserInfo
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

  describe('Connection Lifecycle', () => {
    it('should complete full connection lifecycle', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      await new Promise<void>((resolve, reject) => {
        ws.onerror = reject

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'test-channel' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'subscribed') {
            resolve()
          }
        }
      })

      expect(messages.length).toBeGreaterThanOrEqual(2)
      expect(messages[0].type).toBe('connected')
      expect(messages[0].socketId).toBeDefined()
      expect(messages[1].type).toBe('subscribed')
      expect(messages[1].channel).toBe('test-channel')

      ws.close()
    })

    it('should handle multiple channel subscriptions', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      await new Promise<void>((resolve) => {
        let subscribedCount = 0

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'channel-1' }))
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'channel-2' }))
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'channel-3' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'subscribed') {
            subscribedCount++
            if (subscribedCount === 3) resolve()
          }
        }
      })

      const subscribedMessages = messages.filter((m) => m.type === 'subscribed')
      expect(subscribedMessages.length).toBe(3)
      expect(subscribedMessages.map((m) => m.channel).sort()).toEqual([
        'channel-1',
        'channel-2',
        'channel-3',
      ])

      ws.close()
    })

    it('should handle unsubscribe from channel', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'temp-channel' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'subscribed' && msg.channel === 'temp-channel') {
            ws.send(JSON.stringify({ type: 'unsubscribe', channel: 'temp-channel' }))
          }

          if (msg.type === 'unsubscribed') {
            resolve()
          }
        }
      })

      expect(messages.some((m) => m.type === 'subscribed' && m.channel === 'temp-channel')).toBe(
        true
      )
      expect(messages.some((m) => m.type === 'unsubscribed' && m.channel === 'temp-channel')).toBe(
        true
      )

      ws.close()
    })

    it('should reject invalid message format', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send('invalid json{')
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'error') {
            resolve()
          }
        }
      })

      expect(messages.some((m) => m.type === 'error')).toBe(true)

      ws.close()
    })

    it('should handle connection close gracefully', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'test' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          if (msg.type === 'subscribed') {
            ws.close(1000, 'Normal closure')
          }
        }

        ws.onclose = () => {
          resolve()
        }
      })

      expect(ws.readyState).toBe(WebSocket.CLOSED)
    })
  })

  describe('Presence Channels', () => {
    it('should handle presence channel join with user info', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws?userId=user-123`)
      const messages: any[] = []

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'presence-lobby',
            })
          )
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'presence' && msg.event === 'members') {
            resolve()
          }
        }
      })

      const presenceMsg = messages.find((m) => m.type === 'presence' && m.event === 'members')
      expect(presenceMsg).toBeDefined()
      expect(presenceMsg.data).toBeDefined()
      expect(Array.isArray(presenceMsg.data)).toBe(true)

      ws.close()
    })

    it('should broadcast member joining to existing members', async () => {
      const ws1 = new WebSocket(`ws://localhost:${setup.port}/ws?userId=alice`)
      const ws2 = new WebSocket(`ws://localhost:${setup.port}/ws?userId=bob`)
      const messages1: any[] = []

      await new Promise<void>((resolve) => {
        let ws1Ready = false

        ws1.onopen = () => {
          ws1.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'presence-room',
            })
          )
        }

        ws1.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages1.push(msg)

          if (msg.type === 'presence' && msg.event === 'members' && !ws1Ready) {
            ws1Ready = true
            ws2.send(
              JSON.stringify({
                type: 'subscribe',
                channel: 'presence-room',
              })
            )
          }

          if (msg.type === 'presence' && msg.event === 'join') {
            resolve()
          }
        }

        ws2.onopen = () => {}
        ws2.onmessage = () => {}
      })

      const joiningMsg = messages1.find((m) => m.type === 'presence' && m.event === 'join')
      expect(joiningMsg).toBeDefined()
      expect(joiningMsg.data).toBeDefined()

      ws1.close()
      ws2.close()
    })

    it('should broadcast member leaving when client disconnects', async () => {
      const ws1 = new WebSocket(`ws://localhost:${setup.port}/ws?userId=alice`)
      const ws2 = new WebSocket(`ws://localhost:${setup.port}/ws?userId=bob`)
      const messages1: any[] = []
      let ws2Opened = false

      await new Promise<void>((resolve) => {
        let ws1Subscribed = false
        let ws2Subscribed = false

        ws1.onopen = () => {
          ws1.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'presence-room',
            })
          )
        }

        ws2.onopen = () => {
          ws2Opened = true
        }

        ws1.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages1.push(msg)

          if (msg.type === 'subscribed' && msg.channel === 'presence-room' && !ws1Subscribed) {
            ws1Subscribed = true
            if (ws2Opened) {
              ws2.send(JSON.stringify({ type: 'subscribe', channel: 'presence-room' }))
            }
          }

          if (msg.type === 'presence' && msg.event === 'join' && !ws2Subscribed) {
            ws2Subscribed = true
            setTimeout(() => ws2.close(), 20)
          }

          if (msg.type === 'presence' && msg.event === 'leave') {
            resolve()
          }
        }

        ws2.onmessage = () => {}
      })

      const leaveMsg = messages1.find((m) => m.type === 'presence' && m.event === 'leave')
      expect(leaveMsg).toBeDefined()
      expect(leaveMsg.data).toBeDefined()

      ws1.close()
    })
  })

  describe('Broadcast Message Delivery', () => {
    it('should deliver broadcast to all subscribed clients', async () => {
      const ws1 = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const ws2 = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const ws3 = new WebSocket(`ws://localhost:${setup.port}/ws`)

      const receivedBy: string[] = []

      await new Promise<void>((resolve) => {
        let subscribedCount = 0

        const onSubscribed = () => {
          subscribedCount++
          if (subscribedCount === 3) {
            setup.server.broadcast('broadcast-test', 'TestEvent', { message: 'hello' })
          }
        }

        ws1.onopen = () =>
          ws1.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))
        ws2.onopen = () =>
          ws2.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))
        ws3.onopen = () =>
          ws3.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))

        ws1.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          if (msg.type === 'subscribed') onSubscribed()
          if (msg.type === 'event' && msg.event === 'TestEvent') {
            receivedBy.push('ws1')
            if (receivedBy.length === 3) resolve()
          }
        }

        ws2.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          if (msg.type === 'subscribed') onSubscribed()
          if (msg.type === 'event' && msg.event === 'TestEvent') {
            receivedBy.push('ws2')
            if (receivedBy.length === 3) resolve()
          }
        }

        ws3.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          if (msg.type === 'subscribed') onSubscribed()
          if (msg.type === 'event' && msg.event === 'TestEvent') {
            receivedBy.push('ws3')
            if (receivedBy.length === 3) resolve()
          }
        }
      })

      expect(receivedBy.sort()).toEqual(['ws1', 'ws2', 'ws3'])

      ws1.close()
      ws2.close()
      ws3.close()
    })

    it('should not deliver broadcast to unsubscribed clients', async () => {
      const ws1 = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const ws2 = new WebSocket(`ws://localhost:${setup.port}/ws`)

      const messages1: any[] = []
      const messages2: any[] = []

      await new Promise<void>((resolve) => {
        let ws1Subscribed = false

        ws1.onopen = () => {
          ws1.send(JSON.stringify({ type: 'subscribe', channel: 'channel-a' }))
        }

        ws2.onopen = () => {
          ws2.send(JSON.stringify({ type: 'subscribe', channel: 'channel-b' }))
        }

        ws1.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages1.push(msg)

          if (msg.type === 'subscribed' && !ws1Subscribed) {
            ws1Subscribed = true
          }
        }

        ws2.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages2.push(msg)

          if (msg.type === 'subscribed') {
            setup.server.broadcast('channel-a', 'OnlyForA', { data: 'test' })
            setTimeout(resolve, 100)
          }
        }
      })

      expect(messages1.some((m) => m.type === 'event' && m.event === 'OnlyForA')).toBe(true)
      expect(messages2.some((m) => m.type === 'event' && m.event === 'OnlyForA')).toBe(false)

      ws1.close()
      ws2.close()
    })

    it('should handle broadcast with complex data payload', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      const complexPayload = {
        user: { id: 123, name: 'Alice', profile: { avatar: 'url' } },
        items: [1, 2, 3],
        metadata: { timestamp: Date.now(), tags: ['a', 'b'] },
      }

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: 'complex-data' }))
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'subscribed') {
            setup.server.broadcast('complex-data', 'ComplexEvent', complexPayload)
          }

          if (msg.type === 'event' && msg.event === 'ComplexEvent') {
            resolve()
          }
        }
      })

      const eventMsg = messages.find((m) => m.type === 'event' && m.event === 'ComplexEvent')
      expect(eventMsg).toBeDefined()
      expect(eventMsg.data.user.id).toBe(123)
      expect(eventMsg.data.items).toEqual([1, 2, 3])

      ws.close()
    })
  })

  describe('Private Channels', () => {
    it('should reject private channel without userId', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws`)
      const messages: any[] = []

      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'private-secret',
            })
          )
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'error') {
            resolve()
          }
        }
      })

      expect(messages.some((m) => m.type === 'error')).toBe(true)

      ws.close()
    })

    it('should allow private channel with valid userId', async () => {
      const ws = new WebSocket(`ws://localhost:${setup.port}/ws?userId=user-456`)
      const messages: any[] = []

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout: did not receive subscribed message'))
        }, 1000)

        ws.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'private-orders',
            })
          )
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data.toString())
          messages.push(msg)

          if (msg.type === 'subscribed' && msg.channel === 'private-orders') {
            clearTimeout(timeout)
            resolve()
          }

          if (msg.type === 'error') {
            clearTimeout(timeout)
            reject(new Error(`Subscription error: ${msg.message}`))
          }
        }
      })

      expect(messages.some((m) => m.type === 'subscribed' && m.channel === 'private-orders')).toBe(
        true
      )

      ws.close()
    })
  })
})
