/**
 * @gravito/core - EventPriorityQueue RetryScheduler Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { EventPriorityQueue } from '../../src/events/EventPriorityQueue'
import { RetryScheduler } from '../../src/events/RetryScheduler'

describe('EventPriorityQueue RetryScheduler Integration', () => {
  let queue: EventPriorityQueue
  let scheduler: RetryScheduler

  beforeEach(() => {
    queue = new EventPriorityQueue()
    scheduler = new RetryScheduler({ enabled: false }) // Disabled to avoid bullmq
  })

  afterEach(async () => {
    if (scheduler) {
      await scheduler.shutdown()
    }
  })

  it('should set and get RetryScheduler', () => {
    queue.setRetryScheduler(scheduler)
    const retrieved = queue.getRetryScheduler()

    expect(retrieved).toBe(scheduler)
  })

  it('should support no RetryScheduler (default)', () => {
    // Without setting RetryScheduler
    const retrieved = queue.getRetryScheduler()
    expect(retrieved).toBeUndefined()
  })

  it('should return undefined for getRetryScheduler when not set', () => {
    const queue2 = new EventPriorityQueue()
    expect(queue2.getRetryScheduler()).toBeUndefined()
  })

  it('should handle disabled RetryScheduler gracefully', () => {
    const disabledScheduler = new RetryScheduler({ enabled: false })
    queue.setRetryScheduler(disabledScheduler)

    // Scheduler should be set but disabled
    expect(queue.getRetryScheduler()).toBe(disabledScheduler)
    expect(disabledScheduler.isEnabled()).toBe(false)
  })
})
