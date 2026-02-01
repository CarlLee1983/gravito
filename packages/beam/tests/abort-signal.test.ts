import { describe, expect, it } from 'vitest'
import { mergeAbortSignals } from '../src/utils'

describe('AbortSignal Integration (v1.1)', () => {
  describe('mergeAbortSignals', () => {
    it('should return a signal that never aborts when no signals provided', () => {
      const signal = mergeAbortSignals([])
      expect(signal.aborted).toBe(false)
    })

    it('should return the same signal when only one signal provided', () => {
      const controller = new AbortController()
      const signal = mergeAbortSignals([controller.signal])
      expect(signal).toBe(controller.signal)
    })

    it('should merge multiple signals and abort when any aborts', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const merged = mergeAbortSignals([controller1.signal, controller2.signal])
      expect(merged.aborted).toBe(false)

      controller1.abort()
      expect(merged.aborted).toBe(true)
    })

    it('should handle already aborted signals', () => {
      const controller1 = new AbortController()
      controller1.abort()

      const controller2 = new AbortController()

      const merged = mergeAbortSignals([controller1.signal, controller2.signal])
      expect(merged.aborted).toBe(true)
    })

    it('should filter out undefined signals', () => {
      const controller = new AbortController()
      const merged = mergeAbortSignals([undefined, controller.signal, undefined])
      expect(merged).toBe(controller.signal)
    })

    it('should abort merged signal when second signal aborts', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const merged = mergeAbortSignals([controller1.signal, controller2.signal])
      expect(merged.aborted).toBe(false)

      controller2.abort()
      expect(merged.aborted).toBe(true)
    })
  })
})
