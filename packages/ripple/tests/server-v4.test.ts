import { describe, expect, it, mock } from 'bun:test'
import { RippleServer } from '../src/RippleServer'

describe('RippleServer v4 Interceptors', () => {
  it('should intercept incoming messages', async () => {
    const order: string[] = []
    const server = new RippleServer({
      interceptors: [
        async (ctx, next) => {
          order.push('interceptor-in')
          await next()
          order.push('interceptor-out')
        },
      ],
    })

    const handler = server.getHandler()
    const ws = {
      data: { id: 'test-client', channels: new Set() },
      send: mock(() => {}),
    } as any

    // Simulate incoming ping
    await handler.message(ws, JSON.stringify({ type: 'ping' }))

    expect(order).toEqual(['interceptor-in', 'interceptor-out'])
    // Ensure pong was sent
    expect(ws.send).toHaveBeenCalled()
    const sentMsg = JSON.parse(ws.send.mock.calls[0][0])
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
    })

    const handler = server.getHandler()
    let capturedData: any = null

    server.on('whisper', (ws, data) => {
      capturedData = data
    })

    const ws = {
      data: { id: 'test-client', channels: new Set() },
      send: mock(() => {}),
    } as any

    handler.open(ws)

    // Subscribe via handler
    await handler.message(ws, JSON.stringify({ type: 'subscribe', channel: 'test' }))

    await handler.message(
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
