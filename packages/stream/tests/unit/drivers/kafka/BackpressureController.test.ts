import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { BackpressureController } from '../../../../src/drivers/kafka/BackpressureController'

describe('BackpressureController', () => {
  let controller: BackpressureController
  const bufferSize = 100

  beforeEach(() => {
    controller = new BackpressureController(bufferSize)
  })

  describe('Watermark calculation', () => {
    it('should use default watermarks', () => {
      expect(controller.isPaused()).toBe(false)
    })

    it('should throw if highWatermark <= lowWatermark', () => {
      expect(() => {
        new BackpressureController(100, {
          highWatermark: 0.5,
          lowWatermark: 0.6,
        })
      }).toThrow()
    })

    it('should accept custom watermarks', () => {
      const c = new BackpressureController(100, {
        highWatermark: 0.7,
        lowWatermark: 0.3,
      })
      expect(c).toBeDefined()
    })
  })

  describe('shouldPause()', () => {
    it('should return false when buffer below high watermark', () => {
      const result = controller.shouldPause(75) // 75 < 100 * 0.8
      expect(result).toBe(false)
    })

    it('should return true when buffer exceeds high watermark', () => {
      const result = controller.shouldPause(81) // 81 > 100 * 0.8
      expect(result).toBe(true)
    })

    it('should return false if already paused', () => {
      controller.evaluate(90, ['test'])
      expect(controller.isPaused()).toBe(true)
      const result = controller.shouldPause(90)
      expect(result).toBe(false) // Should not pause again
    })
  })

  describe('shouldResume()', () => {
    it('should return false when buffer above low watermark', () => {
      controller.evaluate(90, ['test'])
      const result = controller.shouldResume(60) // 60 > 100 * 0.5
      expect(result).toBe(false)
    })

    it('should return true when buffer below low watermark while paused', () => {
      controller.evaluate(90, ['test'])
      expect(controller.isPaused()).toBe(true)
      const result = controller.shouldResume(45) // 45 < 100 * 0.5
      expect(result).toBe(true)
    })

    it('should return false if already resumed', () => {
      expect(controller.isPaused()).toBe(false)
      const result = controller.shouldResume(30)
      expect(result).toBe(false)
    })
  })

  describe('Slot management', () => {
    it('should acquire slot when below maxInFlight', () => {
      const result = controller.acquireSlot()
      expect(result).toBe(true)
      expect(controller.getInFlightCount()).toBe(1)
    })

    it('should return false when maxInFlight reached', () => {
      const c = new BackpressureController(100, { maxInFlight: 2 })
      expect(c.acquireSlot()).toBe(true)
      expect(c.acquireSlot()).toBe(true)
      expect(c.acquireSlot()).toBe(false)
    })

    it('should release slot correctly', () => {
      controller.acquireSlot()
      expect(controller.getInFlightCount()).toBe(1)
      controller.releaseSlot()
      expect(controller.getInFlightCount()).toBe(0)
    })

    it('should not go negative on extra release', () => {
      controller.releaseSlot()
      expect(controller.getInFlightCount()).toBe(0)
    })

    it('should handle rapid acquire/release', () => {
      for (let i = 0; i < 100; i++) {
        expect(controller.acquireSlot()).toBe(true)
        controller.releaseSlot()
      }
      expect(controller.getInFlightCount()).toBe(0)
    })
  })

  describe('Callback invocation', () => {
    it('should invoke onPause when high watermark exceeded', () => {
      const onPause = mock(() => {})
      const onResume = mock(() => {})
      controller.onBackpressure({ pause: onPause, resume: onResume })

      controller.evaluate(81, ['test'])

      expect(onPause).toHaveBeenCalledWith(['test'])
      expect(onResume).toHaveBeenCalledTimes(0)
    })

    it('should invoke onResume when low watermark undercut', () => {
      const onPause = mock(() => {})
      const onResume = mock(() => {})
      controller.onBackpressure({ pause: onPause, resume: onResume })

      controller.evaluate(90, ['test'])
      expect(onPause).toHaveBeenCalled()
      expect(controller.isPaused()).toBe(true)

      controller.evaluate(45, ['test'])
      expect(onResume).toHaveBeenCalledWith(['test'])
      expect(controller.isPaused()).toBe(false)
    })

    it('should handle multiple topics', () => {
      const onPause = mock(() => {})
      controller.onBackpressure({ pause: onPause, resume: () => {} })

      controller.evaluate(81, ['topic1', 'topic2'])

      expect(onPause).toHaveBeenCalledWith(['topic1', 'topic2'])
    })
  })

  describe('State management', () => {
    it('should track pause state', () => {
      expect(controller.isPaused()).toBe(false)
      controller.evaluate(81, ['test'])
      expect(controller.isPaused()).toBe(true)
    })

    it('should reset state', () => {
      controller.acquireSlot()
      controller.evaluate(81, ['test'])
      expect(controller.getInFlightCount()).toBe(1)
      expect(controller.isPaused()).toBe(true)

      controller.reset()
      expect(controller.getInFlightCount()).toBe(0)
      expect(controller.isPaused()).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle buffer size zero', () => {
      const c = new BackpressureController(0)
      // With zero buffer, threshold is 0, so any value >= 0 triggers pause
      expect(c.shouldPause(0)).toBe(true)
    })

    it('should handle buffer at exact watermark', () => {
      const result = controller.shouldPause(80) // Exactly 100 * 0.8
      expect(result).toBe(true)
    })

    it('should handle maxInFlight of 1', () => {
      const c = new BackpressureController(100, { maxInFlight: 1 })
      expect(c.acquireSlot()).toBe(true)
      expect(c.acquireSlot()).toBe(false)
    })

    it('should handle custom watermarks close together', () => {
      const c = new BackpressureController(100, {
        highWatermark: 0.6,
        lowWatermark: 0.55,
      })
      expect(c).toBeDefined()
    })
  })

  describe('Multi-buffer evaluation', () => {
    it('should pause when buffer exceeds threshold', () => {
      const onPause = mock(() => {})
      controller.onBackpressure({ pause: onPause, resume: () => {} })

      controller.evaluate(81, ['queue1'])
      expect(controller.isPaused()).toBe(true)

      // When buffer drops below resume threshold, it resumes
      // (This controller manages a single logical buffer, not per-queue state)
      controller.evaluate(40, ['queue2'])
      expect(controller.isPaused()).toBe(false) // 40 < 50 triggers resume
    })

    it('should resume when buffer drops below low watermark', () => {
      const onResume = mock(() => {})
      controller.onBackpressure({ pause: () => {}, resume: onResume })

      // Pause
      controller.evaluate(81, ['queue1'])
      expect(controller.isPaused()).toBe(true)

      // onResume not called yet
      expect(onResume).toHaveBeenCalledTimes(0)

      // Now drop below threshold to trigger resume
      controller.evaluate(45, ['queue1'])
      expect(onResume).toHaveBeenCalled()
    })
  })
})
