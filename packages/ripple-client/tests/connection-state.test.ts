import { describe, expect, it, mock } from 'bun:test'
import type { ConnectionState } from '../src/RippleClient'
import { RippleClient } from '../src/RippleClient'

describe('ConnectionStateManager Integration', () => {
  it('should emit state changes', async () => {
    // Mock WebSocket
    global.WebSocket = class MockWebSocket {
      onopen = () => {}
      onmessage = () => {}
      onclose = () => {}
      onerror = () => {}
      send = () => {}
      close = () => {}
      readyState = 1
      constructor(public url: string) {
        setTimeout(() => {
          this.onopen()
          // Simulate server welcome message
          const msg = JSON.stringify({ type: 'connected', socketId: 'test-socket' })
          this.onmessage({ data: msg } as any)
        }, 10)
      }
    } as any

    const client = new RippleClient({ host: 'ws://localhost' })
    const stateSpy = mock((_state: ConnectionState) => {})

    const unsubscribe = client.onStateChange(stateSpy)

    expect(client.getState()).toBe('disconnected')

    await client.connect()

    expect(client.getState()).toBe('connected')
    expect(stateSpy).toHaveBeenCalledWith('connecting', 'disconnected')
    expect(stateSpy).toHaveBeenCalledWith('connected', 'connecting')

    client.disconnect()
    expect(client.getState()).toBe('disconnected')
    expect(stateSpy).toHaveBeenCalledWith('disconnected', 'connected')

    unsubscribe()
  })
})
