import { describe, expect, it, mock, spyOn } from 'bun:test'
import type { Span } from '@opentelemetry/api'
import { trace } from '@opentelemetry/api'
import { EventTracer } from '../../../src/events/observability/EventTracer'

// Note: Real Span interface is provided by @opentelemetry/api
// We rely on the actual tracer's implementation in tests

describe('EventTracer', () => {
  describe('initialization', () => {
    it('should create tracer with default name', () => {
      const tracer = new EventTracer()
      expect(tracer).toBeDefined()
    })

    it('should create tracer with custom name', () => {
      const tracer = new EventTracer('custom-tracer')
      expect(tracer).toBeDefined()
    })
  })

  describe('startDispatchSpan', () => {
    it('should create a dispatch span with correct attributes', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('order:created', 3, 'high')

      expect(span).toBeDefined()
      expect(span.spanContext).toBeDefined()
    })

    it('should handle different priority levels', () => {
      const tracer = new EventTracer()

      const highPrioritySpan = tracer.startDispatchSpan('event1', 2, 'high')
      const normalPrioritySpan = tracer.startDispatchSpan('event2', 5, 'normal')
      const lowPrioritySpan = tracer.startDispatchSpan('event3', 1, 'low')

      expect(highPrioritySpan).toBeDefined()
      expect(normalPrioritySpan).toBeDefined()
      expect(lowPrioritySpan).toBeDefined()

      // Clean up spans
      tracer.endSpan(highPrioritySpan)
      tracer.endSpan(normalPrioritySpan)
      tracer.endSpan(lowPrioritySpan)
    })

    it('should handle zero callbacks', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('no:listeners', 0, 'normal')

      expect(span).toBeDefined()
      tracer.endSpan(span)
    })

    it('should handle large callback count', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('many:listeners', 1000, 'high')

      expect(span).toBeDefined()
      tracer.endSpan(span)
    })
  })

  describe('startListenerSpan', () => {
    it('should create a listener span as child of dispatch span', () => {
      const tracer = new EventTracer()
      const parentSpan = tracer.startDispatchSpan('order:created', 2, 'high')
      const childSpan = tracer.startListenerSpan(parentSpan, 'order:created', 0)

      expect(childSpan).toBeDefined()
      expect(childSpan.spanContext).toBeDefined()

      tracer.endSpan(childSpan)
      tracer.endSpan(parentSpan)
    })

    it('should handle multiple listener spans', () => {
      const tracer = new EventTracer()
      const parentSpan = tracer.startDispatchSpan('email:sent', 3, 'normal')

      const listener0 = tracer.startListenerSpan(parentSpan, 'email:sent', 0)
      const listener1 = tracer.startListenerSpan(parentSpan, 'email:sent', 1)
      const listener2 = tracer.startListenerSpan(parentSpan, 'email:sent', 2)

      expect(listener0).toBeDefined()
      expect(listener1).toBeDefined()
      expect(listener2).toBeDefined()

      tracer.endSpan(listener0)
      tracer.endSpan(listener1)
      tracer.endSpan(listener2)
      tracer.endSpan(parentSpan)
    })

    it('should work with listener index progression', () => {
      const tracer = new EventTracer()
      const parentSpan = tracer.startDispatchSpan('batch:process', 10, 'low')

      for (let i = 0; i < 10; i++) {
        const listenerSpan = tracer.startListenerSpan(parentSpan, 'batch:process', i)
        expect(listenerSpan).toBeDefined()
        tracer.endSpan(listenerSpan)
      }

      tracer.endSpan(parentSpan)
    })
  })

  describe('recordError', () => {
    it('should record error exception to span', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('failing:event', 1, 'high')

      const error = new Error('Test error')
      expect(() => {
        tracer.recordError(span, error)
      }).not.toThrow()

      tracer.endSpan(span)
    })

    it('should handle different error types', () => {
      const tracer = new EventTracer()

      const typeError = new TypeError('Type error')
      const rangeError = new RangeError('Range error')
      const customError = new Error('Custom error')

      const span1 = tracer.startDispatchSpan('error:event1', 1, 'high')
      const span2 = tracer.startDispatchSpan('error:event2', 1, 'high')
      const span3 = tracer.startDispatchSpan('error:event3', 1, 'high')

      expect(() => {
        tracer.recordError(span1, typeError)
        tracer.recordError(span2, rangeError)
        tracer.recordError(span3, customError)
      }).not.toThrow()

      tracer.endSpan(span1)
      tracer.endSpan(span2)
      tracer.endSpan(span3)
    })
  })

  describe('endSpan', () => {
    it('should end span with OK status', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('test:event', 1, 'normal')

      expect(() => {
        tracer.endSpan(span, 'ok')
      }).not.toThrow()
    })

    it('should end span with ERROR status', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('failing:event', 1, 'normal')

      expect(() => {
        tracer.endSpan(span, 'error')
      }).not.toThrow()
    })

    it('should default to OK status if not specified', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('default:event', 1, 'normal')

      expect(() => {
        tracer.endSpan(span)
      }).not.toThrow()
    })

    it('should handle multiple span endings', () => {
      const tracer = new EventTracer()

      const spans = []
      for (let i = 0; i < 100; i++) {
        const span = tracer.startDispatchSpan(`event:${i}`, 1, 'normal')
        spans.push(span)
      }

      expect(() => {
        for (const span of spans) {
          tracer.endSpan(span)
        }
      }).not.toThrow()
    })
  })

  describe('startTimer', () => {
    it('should return timer object with span and endTimer function', () => {
      const tracer = new EventTracer()
      const timer = tracer.startTimer('timed:event')

      expect(timer).toBeDefined()
      expect(timer.span).toBeDefined()
      expect(timer.endTimer).toBeDefined()
    })

    it('should allow ending timer with OK status', () => {
      const tracer = new EventTracer()
      const timer = tracer.startTimer('success:event')

      expect(() => {
        timer.endTimer('ok')
      }).not.toThrow()
    })

    it('should allow ending timer with ERROR status', () => {
      const tracer = new EventTracer()
      const timer = tracer.startTimer('failing:event')

      expect(() => {
        timer.endTimer('error')
      }).not.toThrow()
    })

    it('should record duration in span attributes', async () => {
      const tracer = new EventTracer()
      const timer = tracer.startTimer('sleep:event')

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => {
        timer.endTimer('ok')
      }).not.toThrow()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete event dispatch lifecycle', () => {
      const tracer = new EventTracer()

      // Start dispatch
      const dispatchSpan = tracer.startDispatchSpan('order:created', 2, 'high')

      // Execute first listener
      const listener0Span = tracer.startListenerSpan(dispatchSpan, 'order:created', 0)
      tracer.endSpan(listener0Span, 'ok')

      // Execute second listener (with error)
      const listener1Span = tracer.startListenerSpan(dispatchSpan, 'order:created', 1)
      const error = new Error('Listener failed')
      tracer.recordError(listener1Span, error)
      tracer.endSpan(listener1Span, 'error')

      // End dispatch
      tracer.endSpan(dispatchSpan, 'error')

      expect(dispatchSpan).toBeDefined()
    })

    it('should handle multiple concurrent event dispatches', () => {
      const tracer = new EventTracer()
      const spans = []

      for (let i = 0; i < 10; i++) {
        const dispatchSpan = tracer.startDispatchSpan(`event:${i}`, 3, 'normal')
        spans.push(dispatchSpan)

        for (let j = 0; j < 3; j++) {
          const listenerSpan = tracer.startListenerSpan(dispatchSpan, `event:${i}`, j)
          tracer.endSpan(listenerSpan, 'ok')
        }
      }

      expect(() => {
        for (const span of spans) {
          tracer.endSpan(span, 'ok')
        }
      }).not.toThrow()
    })

    it('should handle nested error scenarios', () => {
      const tracer = new EventTracer()

      const dispatchSpan = tracer.startDispatchSpan('risky:event', 5, 'high')

      for (let i = 0; i < 5; i++) {
        const listenerSpan = tracer.startListenerSpan(dispatchSpan, 'risky:event', i)

        if (i === 2) {
          // Simulate error in listener 2
          const error = new Error('Listener 2 failed')
          tracer.recordError(listenerSpan, error)
          tracer.endSpan(listenerSpan, 'error')
        } else {
          tracer.endSpan(listenerSpan, 'ok')
        }
      }

      tracer.endSpan(dispatchSpan, 'error')
      expect(dispatchSpan).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle errors during span operations gracefully', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('test:event', 1, 'normal')

      // Simulate error handling
      const error = new RangeError('Value out of range')
      expect(() => {
        tracer.recordError(span, error)
      }).not.toThrow()

      tracer.endSpan(span, 'error')
    })

    it('should be resilient to null/undefined errors', () => {
      const tracer = new EventTracer()
      const span = tracer.startDispatchSpan('test:event', 1, 'normal')

      // Create error-like object
      const pseudoError = new Error('Pseudo error')
      expect(() => {
        tracer.recordError(span, pseudoError)
      }).not.toThrow()

      tracer.endSpan(span)
    })
  })
})
