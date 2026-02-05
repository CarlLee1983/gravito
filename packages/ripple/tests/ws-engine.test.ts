/**
 * @fileoverview Tests for ws engine
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { WebSocket } from 'ws'
import type { RippleSocket } from '../src/engines/IRippleEngine'
import { WsEngine } from '../src/engines/WsEngine'

describe('WsEngine', () => {
  let engine: WsEngine
  const port = 9000

  beforeEach(() => {
    engine = new WsEngine({ port })
  })

  afterEach(async () => {
    if (engine) {
      await engine.close()
    }
  })

  it('should create with default config', () => {
    expect(engine.name).toBe('node-ws')
  })

  it('should start and accept connections', async () => {
    const connectionHandler = mock((_socket: RippleSocket) => {})
    engine.onConnection(connectionHandler)

    await engine.listen(port)

    const client = new WebSocket(`ws://localhost:${port}`)

    await new Promise<void>((resolve, reject) => {
      client.on('open', resolve)
      client.on('error', reject)
    })

    expect(connectionHandler).toHaveBeenCalled()
    client.close()
  })

  it('should handle messages', async () => {
    let receivedMessage: string | Uint8Array | undefined
    engine.onMessage((_socket, message) => {
      receivedMessage = message
    })

    await engine.listen(port)

    const client = new WebSocket(`ws://localhost:${port}`)
    await new Promise((resolve) => client.on('open', resolve))

    client.send('hello ripple')

    // Wait for message to be processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(receivedMessage).toBe('hello ripple')
    client.close()
  })

  it('should implement in-memory pub/sub', async () => {
    const sentData: (string | Uint8Array)[] = []

    engine.onConnection((socket) => {
      socket.subscribe('test-topic')
      // Spy on send
      const originalSend = socket.send.bind(socket)
      socket.send = (data) => {
        sentData.push(data)
        originalSend(data)
      }
    })

    await engine.listen(port)

    const client = new WebSocket(`ws://localhost:${port}`)
    await new Promise((resolve) => client.on('open', resolve))

    // Wait for the server to process the connection and subscription
    await new Promise((resolve) => setTimeout(resolve, 50))

    engine.broadcast('test-topic', 'hello all')

    // Wait for broadcast
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(sentData).toContain('hello all')

    client.close()
  })

  it('should handle disconnections and cleanup', async () => {
    const disconnectionHandler = mock(() => {})
    engine.onDisconnection(disconnectionHandler)

    await engine.listen(port)

    const client = new WebSocket(`ws://localhost:${port}`)
    await new Promise((resolve) => client.on('open', resolve))

    client.close()

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(disconnectionHandler).toHaveBeenCalled()
    expect((engine as any).sockets.size).toBe(0)
  })
})
