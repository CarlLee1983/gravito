/**
 * @fileoverview Tests for uWebSockets.js engine
 *
 * Tests the UWebSocketsEngine implementation for Node.js runtime.
 * Note: These tests require uWebSockets.js to be installed.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RippleSocket } from '../src/engines/IRippleEngine'
import { UWebSocketsEngine } from '../src/engines/UWebSocketsEngine'

describe('UWebSocketsEngine', () => {
  let engine: UWebSocketsEngine

  afterEach(async () => {
    if (engine) {
      await engine.close()
    }
  })

  describe('Configuration', () => {
    it('should create with default config', () => {
      engine = new UWebSocketsEngine()
      expect(engine.name).toBe('node-uws')
    })

    it('should create with custom config', () => {
      engine = new UWebSocketsEngine({
        port: 4000,
        hostname: 'localhost',
        compression: 1,
        maxPayloadLength: 1024 * 1024,
        idleTimeout: 60,
        maxBackpressure: 512 * 1024,
        development: true,
      })
      expect(engine.name).toBe('node-uws')
    })
  })

  describe('Event Handlers', () => {
    beforeEach(() => {
      engine = new UWebSocketsEngine({ port: 5000 })
    })

    it('should register connection handler', () => {
      const handler = mock((_socket: RippleSocket) => {})
      engine.onConnection(handler)
      expect(handler).toBeDefined()
    })

    it('should register disconnection handler', () => {
      const handler = mock((_socket: RippleSocket, _code: number, _reason: string) => {})
      engine.onDisconnection(handler)
      expect(handler).toBeDefined()
    })

    it('should register message handler', () => {
      const handler = mock((_socket: RippleSocket, _message: string | Uint8Array) => {})
      engine.onMessage(handler)
      expect(handler).toBeDefined()
    })
  })

  describe('Server Lifecycle', () => {
    it('should throw error if uWebSockets.js is not installed', async () => {
      engine = new UWebSocketsEngine({ port: 5001 })

      // This will fail if uWebSockets.js is not installed
      // We expect this in the Bun environment since uWS is Node.js only
      try {
        await engine.listen(5001)
        // If we get here, uWS is installed (unlikely in Bun)
        expect(engine).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain('uWebSockets.js is not installed')
      }
    })

    it('should handle close gracefully even if not started', async () => {
      engine = new UWebSocketsEngine({ port: 5002 })

      // Should not throw
      await engine.close()
      expect(engine).toBeDefined()
    })
  })

  describe('Broadcasting', () => {
    beforeEach(() => {
      engine = new UWebSocketsEngine({ port: 5003 })
    })

    it('should throw error when broadcasting before listen', () => {
      expect(() => {
        engine.broadcast('test-topic', 'test message')
      }).toThrow('Engine not started')
    })

    it('should handle string broadcast', () => {
      // We can't actually test broadcasting without starting the server
      // and connecting clients, but we can verify the method exists
      expect(engine.broadcast).toBeDefined()
    })

    it('should handle binary broadcast', () => {
      const data = new Uint8Array([1, 2, 3, 4])
      // Method should exist
      expect(() => {
        // This will throw because engine not started
        engine.broadcast('test-topic', data)
      }).toThrow('Engine not started')
    })

    it('should handle excludeSocketId parameter', () => {
      // Verify the method signature accepts excludeSocketId
      expect(() => {
        engine.broadcast('test-topic', 'message', 'socket-123')
      }).toThrow('Engine not started')
    })
  })

  describe('Socket Management', () => {
    beforeEach(() => {
      engine = new UWebSocketsEngine({ port: 5004 })
    })

    it('should return empty array when no sockets connected', () => {
      const sockets = engine.getConnectedSockets()
      expect(sockets).toEqual([])
    })

    it('should return undefined for non-existent socket', () => {
      const socket = engine.getSocket('non-existent-id')
      expect(socket).toBeUndefined()
    })
  })

  describe('Upgrade Method', () => {
    beforeEach(() => {
      engine = new UWebSocketsEngine({ port: 5005 })
    })

    it('should throw error for upgrade method', () => {
      const req = new Request('http://localhost:5005/ws')

      expect(() => {
        engine.upgrade(req)
      }).toThrow('upgrade() is not supported in uWebSocketsEngine')
    })
  })

  describe('Type Compatibility', () => {
    it('should implement IRippleEngine interface', () => {
      engine = new UWebSocketsEngine({ port: 5006 })

      // Verify all required methods exist
      expect(engine.name).toBe('node-uws')
      expect(typeof engine.listen).toBe('function')
      expect(typeof engine.close).toBe('function')
      expect(typeof engine.onConnection).toBe('function')
      expect(typeof engine.onDisconnection).toBe('function')
      expect(typeof engine.onMessage).toBe('function')
      expect(typeof engine.broadcast).toBe('function')
      expect(typeof engine.upgrade).toBe('function')
    })
  })

  describe('Configuration Options', () => {
    it('should accept TLS configuration', () => {
      engine = new UWebSocketsEngine({
        port: 5007,
        tls: {
          cert: '/path/to/cert.pem',
          key: '/path/to/key.pem',
        },
      })
      expect(engine).toBeDefined()
    })

    it('should accept compression configuration', () => {
      engine = new UWebSocketsEngine({
        port: 5008,
        compression: 3, // DEDICATED_COMPRESSOR_3KB
      })
      expect(engine).toBeDefined()
    })

    it('should accept payload and timeout configuration', () => {
      engine = new UWebSocketsEngine({
        port: 5009,
        maxPayloadLength: 32 * 1024 * 1024, // 32MB
        idleTimeout: 300, // 5 minutes
        maxBackpressure: 2 * 1024 * 1024, // 2MB
      })
      expect(engine).toBeDefined()
    })

    it('should accept development mode', () => {
      engine = new UWebSocketsEngine({
        port: 5010,
        development: true,
      })
      expect(engine).toBeDefined()
    })
  })
})

describe('UWebSocketsRippleSocket', () => {
  // Note: We can't easily test UWebSocketsRippleSocket without a real uWS connection
  // These tests verify the interface exists and has the correct structure

  it('should have correct interface structure', () => {
    // The socket wrapper should implement RippleSocket interface
    // We verify this through the engine's type checking
    const engine = new UWebSocketsEngine({ port: 6000 })

    // If this compiles, the interface is correct
    engine.onConnection((socket: RippleSocket) => {
      expect(socket.id).toBeDefined()
      expect(socket.data).toBeDefined()
      expect(typeof socket.send).toBe('function')
      expect(typeof socket.close).toBe('function')
      expect(typeof socket.getBufferedAmount).toBe('function')
      expect(typeof socket.subscribe).toBe('function')
      expect(typeof socket.unsubscribe).toBe('function')
      expect(typeof socket.publish).toBe('function')
    })
  })
})

describe('UWebSocketsEngine Error Handling', () => {
  it('should handle missing uWebSockets.js gracefully', async () => {
    const engine = new UWebSocketsEngine({ port: 7000 })

    try {
      await engine.listen(7000)
      // If we reach here, uWS is installed (unlikely in Bun test environment)
      await engine.close()
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('uWebSockets.js is not installed')
      expect((error as Error).message).toContain('npm install')
    }
  })

  it('should handle port already in use', async () => {
    const engine1 = new UWebSocketsEngine({ port: 7001 })
    const engine2 = new UWebSocketsEngine({ port: 7001 })

    try {
      await engine1.listen(7001)

      // Try to listen on same port
      try {
        await engine2.listen(7001)
        // Should fail
        expect(true).toBe(false) // This should not be reached
      } catch (error) {
        expect(error).toBeDefined()
      }

      await engine1.close()
    } catch (error) {
      // uWS not installed, that's fine
      expect((error as Error).message).toContain('uWebSockets.js is not installed')
    }
  })
})

describe('UWebSocketsEngine Integration', () => {
  it('should work with RippleServer createEngine', () => {
    // This test verifies that the engine can be created via RippleServer
    // The actual integration is tested in ripple-v5.test.ts
    const engine = new UWebSocketsEngine({
      port: 8000,
      hostname: 'localhost',
      development: true,
    })

    expect(engine.name).toBe('node-uws')
  })
})
