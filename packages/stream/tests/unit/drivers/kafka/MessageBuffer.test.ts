import { beforeEach, describe, expect, it } from 'bun:test'
import { MessageBuffer } from '../../../../src/drivers/kafka/MessageBuffer'
import type { BufferedMessage } from '../../../../src/drivers/kafka/types'

describe('MessageBuffer', () => {
  let buffer: MessageBuffer
  let testMessage: BufferedMessage

  beforeEach(() => {
    buffer = new MessageBuffer(10)
    testMessage = {
      job: {
        id: 'job-1',
        type: 'json',
        data: '{}',
        createdAt: Date.now(),
      },
      topic: 'test-topic',
      partition: 0,
      offset: '100',
      timestamp: Date.now(),
      acknowledged: false,
    }
  })

  describe('Lifecycle', () => {
    it('should enqueue a message successfully', () => {
      const result = buffer.enqueue('test', testMessage)
      expect(result).toBe(true)
    })

    it('should return false when buffer is full', () => {
      buffer = new MessageBuffer(2)
      expect(buffer.enqueue('test', testMessage)).toBe(true)
      expect(buffer.enqueue('test', testMessage)).toBe(true)
      expect(buffer.enqueue('test', testMessage)).toBe(false)
    })

    it('should dequeue in FIFO order', () => {
      buffer.enqueue('test', { ...testMessage, offset: '1' })
      buffer.enqueue('test', { ...testMessage, offset: '2' })
      buffer.enqueue('test', { ...testMessage, offset: '3' })

      expect(buffer.dequeue('test')?.offset).toBe('1')
      expect(buffer.dequeue('test')?.offset).toBe('2')
      expect(buffer.dequeue('test')?.offset).toBe('3')
    })

    it('should return null when dequeuing from empty buffer', () => {
      const result = buffer.dequeue('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null when topic is empty', () => {
      buffer.enqueue('test', testMessage)
      buffer.dequeue('test')

      const result = buffer.dequeue('test')
      expect(result).toBeNull()
    })
  })

  describe('Blocking Operations', () => {
    it('should resolve immediately if message is available', async () => {
      buffer.enqueue('test', testMessage)

      const promise = buffer.dequeueBlocking('test', 5000)
      const result = await promise

      expect(result?.offset).toBe(testMessage.offset)
    })

    it('should wait until timeout if no message', async () => {
      const start = Date.now()
      const result = await buffer.dequeueBlocking('test', 100)
      const elapsed = Date.now() - start

      expect(result).toBeNull()
      expect(elapsed).toBeGreaterThanOrEqual(90)
    })

    it('should resolve when message arrives after wait', async () => {
      const promise = buffer.dequeueBlocking('test', 5000)

      setTimeout(() => {
        buffer.enqueue('test', testMessage)
      }, 50)

      const result = await promise
      expect(result?.offset).toBe(testMessage.offset)
    })
  })

  describe('Batch Operations', () => {
    it('should dequeue many messages', () => {
      buffer.enqueue('test', { ...testMessage, offset: '1' })
      buffer.enqueue('test', { ...testMessage, offset: '2' })
      buffer.enqueue('test', { ...testMessage, offset: '3' })

      const results = buffer.dequeueMany('test', 2)
      expect(results.length).toBe(2)
      expect(results[0]?.offset).toBe('1')
      expect(results[1]?.offset).toBe('2')
    })

    it('should return fewer than requested if not enough', () => {
      buffer.enqueue('test', { ...testMessage, offset: '1' })
      buffer.enqueue('test', { ...testMessage, offset: '2' })

      const results = buffer.dequeueMany('test', 5)
      expect(results.length).toBe(2)
    })

    it('should return empty array if no messages', () => {
      const results = buffer.dequeueMany('test', 5)
      expect(results.length).toBe(0)
    })
  })

  describe('Size and Clear', () => {
    it('should return correct size', () => {
      buffer.enqueue('test', testMessage)
      buffer.enqueue('test', testMessage)

      expect(buffer.size('test')).toBe(2)
    })

    it('should return 0 for nonexistent topic', () => {
      expect(buffer.size('nonexistent')).toBe(0)
    })

    it('should clear topic buffer', () => {
      buffer.enqueue('test', testMessage)
      buffer.enqueue('test', testMessage)

      buffer.clear('test')
      expect(buffer.size('test')).toBe(0)
    })

    it('should not affect other topics', () => {
      buffer.enqueue('test1', testMessage)
      buffer.enqueue('test2', testMessage)

      buffer.clear('test1')
      expect(buffer.size('test1')).toBe(0)
      expect(buffer.size('test2')).toBe(1)
    })
  })

  describe('Multiple Topics', () => {
    it('should maintain independent buffers per topic', () => {
      buffer.enqueue('topic1', { ...testMessage, offset: '1' })
      buffer.enqueue('topic2', { ...testMessage, offset: '2' })
      buffer.enqueue('topic1', { ...testMessage, offset: '3' })

      expect(buffer.size('topic1')).toBe(2)
      expect(buffer.size('topic2')).toBe(1)

      expect(buffer.dequeue('topic1')?.offset).toBe('1')
      expect(buffer.dequeue('topic2')?.offset).toBe('2')
      expect(buffer.dequeue('topic1')?.offset).toBe('3')
    })
  })

  describe('Destroy', () => {
    it('should clear all buffers on destroy', () => {
      buffer.enqueue('test1', testMessage)
      buffer.enqueue('test2', testMessage)

      buffer.destroy()

      expect(buffer.size('test1')).toBe(0)
      expect(buffer.size('test2')).toBe(0)
    })

    it('should resolve pending waiters with null', async () => {
      const promise = buffer.dequeueBlocking('test', 10000)

      setTimeout(() => {
        buffer.destroy()
      }, 50)

      const result = await promise
      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid enqueue/dequeue', () => {
      buffer = new MessageBuffer(1000) // Use larger buffer
      for (let i = 0; i < 100; i++) {
        buffer.enqueue('test', { ...testMessage, offset: String(i) })
      }

      for (let i = 0; i < 100; i++) {
        const msg = buffer.dequeue('test')
        expect(msg?.offset).toBe(String(i))
      }
    })

    it('should handle large buffer size', () => {
      const largeBuffer = new MessageBuffer(10000)

      for (let i = 0; i < 5000; i++) {
        const result = largeBuffer.enqueue('test', { ...testMessage, offset: String(i) })
        expect(result).toBe(true)
      }

      expect(largeBuffer.size('test')).toBe(5000)
    })
  })
})
