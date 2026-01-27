import { describe, expect, it, mock } from 'bun:test'
import { RippleClient } from '../src/RippleClient'

describe('Ripple Binary Support', () => {
  it('should send and receive binary data', async () => {
    let lastSent: any

    global.WebSocket = class MockWebSocket {
      static OPEN = 1
      onopen = () => {}
      onmessage = (ev: any) => {}
      send = (data: any) => {}
      close = () => {}
      readyState = 1
      binaryType = 'blob'
      constructor(public url: string) {
        setTimeout(() => {
          this.onopen()
          this.onmessage({ data: JSON.stringify({ type: 'connected', socketId: 'test' }) })
        }, 10)
      }
    } as any

    const client = new RippleClient({ host: 'ws://localhost' })
    await client.connect()

    const ws = (client as any).ws
    ws.send = (data: any) => {
      lastSent = data
    }

    const channel = client.channel('test-channel')
    const binaryCallback = mock((data: ArrayBuffer) => {
      expect(data.byteLength).toBe(3)
      expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]))
    })

    channel.listen('binary-event', binaryCallback)

    // Test Sending
    const buffer = new Uint8Array([4, 5, 6]).buffer
    client.sendBinary('test-channel', 'send-event', buffer)

    expect(lastSent).toBeInstanceOf(Uint8Array)
    const dv = new DataView(lastSent.buffer)
    const headerLen = dv.getInt32(0, true)
    expect(headerLen).toBeGreaterThan(0)

    // Test Receiving
    const header = JSON.stringify({
      type: 'binary',
      channel: 'test-channel',
      event: 'binary-event',
    })
    const encoder = new TextEncoder()
    const headerBuffer = encoder.encode(header)
    const payload = new Uint8Array([1, 2, 3])

    const total = new Uint8Array(4 + headerBuffer.length + payload.length)
    const dv2 = new DataView(total.buffer)
    dv2.setInt32(0, headerBuffer.length, true)
    total.set(headerBuffer, 4)
    total.set(payload, 4 + headerBuffer.length)

    // Simulate incoming binary message
    // @ts-expect-error
    client.ws.onmessage({ data: total.buffer })

    expect(binaryCallback).toHaveBeenCalled()
  })
})
