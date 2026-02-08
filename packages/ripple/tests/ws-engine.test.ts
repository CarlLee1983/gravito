/**
 * @fileoverview Tests for WsEngine
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { WebSocket } from 'ws'
import { WsEngine } from '../src/engines/WsEngine'

describe('WsEngine', () => {
  let engine: WsEngine
  let port: number

  beforeEach(() => {
    // Random port between 40000-50000 to avoid conflicts
    port = 40000 + Math.floor(Math.random() * 10000)
    engine = new WsEngine({ port })
  })

  afterEach(async () => {
    await engine.close()
  })

  it('should start listening', async () => {
    await engine.listen(port)
    // No error thrown means success
    expect(engine).toBeDefined()
  })

  it('should accept connection', async () => {
    await engine.listen(port)

    // Connect client
    const ws = new WebSocket(`ws://localhost:${port}`)

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        ws.close()
        resolve()
      })
    })

    expect(true).toBe(true)
  })

  it('should handle messages', async () => {
    await engine.listen(port)

    let receivedMessage: string | null = null

    engine.onMessage((_socket, message) => {
      receivedMessage = message.toString()
    })

    engine.onConnection((_socket) => {
      // Echo back
    })

    const ws = new WebSocket(`ws://localhost:${port}`)

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        ws.send('hello')
        setTimeout(resolve, 100)
      })
    })

    expect(receivedMessage).toBe('hello')
    ws.close()
  })
})
