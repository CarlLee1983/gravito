import { describe, expect, it, mock } from 'bun:test'
import { RippleServer } from '../src/RippleServer'

describe('Ripple Rate Limiting', () => {
  it('should limit whisper frequency', async () => {
    const server = new RippleServer({
      rateLimit: { whisperMax: 2, whisperInterval: 1000 },
    })

    const ws: any = {
      data: { id: 'client-1', channels: new Set(['test']) },
      send: mock(() => {}),
    }

    // Inject client into manager for subscribed check
    // @ts-expect-error
    server.channels.addClient(ws)
    // @ts-expect-error
    server.channels.subscribe('client-1', 'test')

    // @ts-expect-error
    server.handleWhisper(ws, 'test', 'evt', {})
    // @ts-expect-error
    server.handleWhisper(ws, 'test', 'evt', {})
    // @ts-expect-error
    server.handleWhisper(ws, 'test', 'evt', {})

    // Third call should fail
    const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1][0]
    const msg = JSON.parse(lastCall)
    expect(msg.type).toBe('error')
    expect(msg.message).toBe('Rate limit exceeded')
  })
})
