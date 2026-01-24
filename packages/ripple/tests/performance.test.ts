import { describe, expect, it, vi } from 'bun:test'
import type { ServerMessage } from '../src/types'
import { MessageSerializer } from '../src/utils/MessageSerializer'

describe('Performance Optimizations', () => {
  describe('MessageSerializer', () => {
    it('should cache broadcast messages to serialize only once', () => {
      const serializer = new MessageSerializer()
      const spy = vi.spyOn(JSON, 'stringify')

      const message: ServerMessage = {
        type: 'event',
        channel: 'test',
        event: 'TestEvent',
        data: { foo: 'bar' },
      }

      serializer.serializeForBroadcast(message)
      const callCount = spy.mock.calls.length

      serializer.serializeForBroadcast(message)
      expect(spy).toHaveBeenCalledTimes(callCount)

      spy.mockRestore()
    })

    it('should clear cache after broadcast', () => {
      const serializer = new MessageSerializer()
      const spy = vi.spyOn(JSON, 'stringify')

      const message: ServerMessage = {
        type: 'event',
        channel: 'test',
        event: 'TestEvent',
        data: { foo: 'bar' },
      }

      serializer.serializeForBroadcast(message)
      serializer.clearBroadcastCache()

      const callCountBefore = spy.mock.calls.length
      serializer.serializeForBroadcast(message)
      expect(spy.mock.calls.length).toBeGreaterThan(callCountBefore)

      spy.mockRestore()
    })

    it('should use pre-serialized PONG message', () => {
      const serializer = new MessageSerializer()
      const pong1 = serializer.getPongMessage()
      const pong2 = serializer.getPongMessage()

      expect(pong1).toBe(pong2)
    })

    it('should have pre-serialized PONG as static constant', () => {
      const pong = new MessageSerializer().getPongMessage()

      expect(pong).toBe('{"type":"pong"}')
    })
  })

  describe('Broadcast Serialization Count', () => {
    it('should serialize only once for N subscribers', () => {
      const serializer = new MessageSerializer()
      const spy = vi.spyOn(JSON, 'stringify')

      const message: ServerMessage = {
        type: 'event',
        channel: 'test',
        event: 'TestEvent',
        data: { foo: 'bar' },
      }

      serializer.serializeForBroadcast(message)
      const callCountAfterFirst = spy.mock.calls.length

      for (let i = 0; i < 100; i++) {
        serializer.serializeForBroadcast(message)
      }

      expect(spy.mock.calls.length).toBe(callCountAfterFirst)

      serializer.clearBroadcastCache()
      spy.mockRestore()
    })
  })
})
