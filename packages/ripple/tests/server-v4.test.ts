import { describe, expect, it, mock } from 'bun:test'
import { RippleServer } from '../src/RippleServer'

describe('RippleServer v4 Interceptors', () => {
  it('should intercept incoming messages', async () => {
    const order: string[] = []
    const server = new RippleServer({
      interceptors: [
        async (_ctx, next) => {
          order.push('interceptor-in')
          await next()
          order.push('interceptor-out')
        },
      ],
      port: 0,
    })

    const sendMock = mock(() => {})
    const ws = {
      data: {
        id: 'test-client',
        channels: new Set(),
        userId: undefined,
        reconnectionToken: undefined,
        userInfo: undefined,
      },
      send: sendMock,
      close: () => {},
      getBufferedAmount: () => 0,
      subscribe: () => {},
      unsubscribe: () => {},
      publish: () => {},
      id: 'test-client',
    } as any

    const channels = server.channels
    channels.addClient(ws)

    // Simulate incoming ping
    await server.handleMessage(ws, JSON.stringify({ type: 'ping' }))

    expect(order).toEqual(['interceptor-in', 'interceptor-out'])
    // Ensure pong was sent
    expect(sendMock).toHaveBeenCalled()
    const sentMsg = JSON.parse(sendMock.mock.calls[0][0])
    expect(sentMsg.type).toBe('pong')
  })

  it('should be able to modify incoming message data', async () => {
    const server = new RippleServer({
      interceptors: [
        async (ctx, next) => {
          if (ctx.message.type === 'whisper') {
            ;(ctx.message as any).data.modified = true
          }
          await next()
        },
      ],
      port: 0,
    })

    let capturedData: any = null

    server.on('whisper', (_ws, data) => {
      capturedData = data
    })

    const sendMock = mock(() => {})
    const ws = {
      data: {
        id: 'test-client',
        channels: new Set(),
        userId: undefined,
        reconnectionToken: undefined,
        userInfo: undefined,
      },
      send: sendMock,
      close: () => {},
      getBufferedAmount: () => 0,
      subscribe: () => {},
      unsubscribe: () => {},
      publish: () => {},
      id: 'test-client',
    } as any

    const channels = server.channels
    channels.addClient(ws)

    // Subscribe via handleMessage
    await server.handleMessage(ws, JSON.stringify({ type: 'subscribe', channel: 'test' }))

    await server.handleMessage(
      ws,
      JSON.stringify({
        type: 'whisper',
        channel: 'test',
        event: 'msg',
        data: { original: true },
      })
    )

    expect(capturedData.data.modified).toBe(true)
  })
})
