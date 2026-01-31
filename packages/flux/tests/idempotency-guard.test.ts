import { beforeEach, describe, expect, it } from 'bun:test'
import { IdempotencyGuard } from '../src/core/IdempotencyGuard'
import type { StepExecution, WorkflowContext } from '../src/types'

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard
  let baseContext: WorkflowContext<{ userId: string }, { count: number }>

  beforeEach(() => {
    guard = new IdempotencyGuard()
    baseContext = {
      id: 'wf-123',
      name: 'test-workflow',
      input: { userId: '456' },
      data: { count: 0 },
      status: 'running',
      currentStep: 0,
      history: [],
      version: 1,
    }
  })

  describe('canCompensate', () => {
    it('should return true for completed steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'step1')).toBe(true)
    })

    it('should return false for non-existent steps', () => {
      expect(guard.canCompensate(baseContext, 'nonexistent')).toBe(false)
    })

    it('should return false for already compensated steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'step1')).toBe(false)
    })

    it('should return false for compensating steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensating' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'step1')).toBe(false)
    })

    it('should return false for failed steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'failed' as const,
            retries: 3,
            error: 'Step failed',
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'step1')).toBe(false)
    })

    it('should return false for skipped steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'skipped' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'step1')).toBe(false)
    })
  })

  describe('isCompensated', () => {
    it('should return true for compensated steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
        ],
      }

      expect(guard.isCompensated(ctx, 'step1')).toBe(true)
    })

    it('should return false for non-compensated steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.isCompensated(ctx, 'step1')).toBe(false)
    })

    it('should return false for non-existent steps', () => {
      expect(guard.isCompensated(baseContext, 'nonexistent')).toBe(false)
    })
  })

  describe('isCompensating', () => {
    it('should return true for compensating steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensating' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.isCompensating(ctx, 'step1')).toBe(true)
    })

    it('should return false for other statuses', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.isCompensating(ctx, 'step1')).toBe(false)
    })
  })

  describe('getCompensationTimestamp', () => {
    it('should return timestamp for compensated steps', () => {
      const timestamp = new Date('2026-01-01T12:00:00Z')
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: timestamp,
          },
        ],
      }

      expect(guard.getCompensationTimestamp(ctx, 'step1')).toEqual(timestamp)
    })

    it('should return undefined for non-compensated steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.getCompensationTimestamp(ctx, 'step1')).toBeUndefined()
    })

    it('should return undefined for non-existent steps', () => {
      expect(guard.getCompensationTimestamp(baseContext, 'nonexistent')).toBeUndefined()
    })
  })

  describe('getCompensationAttempts', () => {
    it('should return 0 for steps never compensated', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.getCompensationAttempts(ctx, 'step1')).toBe(0)
    })

    it('should count compensated steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
        ],
      }

      expect(guard.getCompensationAttempts(ctx, 'step1')).toBe(1)
    })

    it('should count compensating steps', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensating' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.getCompensationAttempts(ctx, 'step1')).toBe(1)
    })

    it('should count multiple compensation attempts', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
          {
            name: 'step1',
            status: 'compensating' as const,
            retries: 1,
          },
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 2,
            compensatedAt: new Date(),
          },
        ],
      }

      expect(guard.getCompensationAttempts(ctx, 'step1')).toBe(2)
    })

    it('should return 0 for non-existent steps', () => {
      expect(guard.getCompensationAttempts(baseContext, 'nonexistent')).toBe(0)
    })
  })

  describe('allCompensated', () => {
    it('should return true when all steps are compensated', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
          {
            name: 'step2',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
        ],
      }

      expect(guard.allCompensated(ctx, ['step1', 'step2'])).toBe(true)
    })

    it('should return false when some steps are not compensated', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
          {
            name: 'step2',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      expect(guard.allCompensated(ctx, ['step1', 'step2'])).toBe(false)
    })

    it('should return true for empty step list', () => {
      expect(guard.allCompensated(baseContext, [])).toBe(true)
    })
  })

  describe('getPendingCompensations', () => {
    it('should return steps that need compensation', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'completed' as const,
            retries: 0,
          },
          {
            name: 'step2',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
          {
            name: 'step3',
            status: 'completed' as const,
            retries: 0,
          },
        ],
      }

      const pending = guard.getPendingCompensations(ctx, ['step1', 'step2', 'step3'])
      expect(pending).toEqual(['step1', 'step3'])
    })

    it('should return empty array when all steps are compensated', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'step1',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
        ],
      }

      const pending = guard.getPendingCompensations(ctx, ['step1'])
      expect(pending).toEqual([])
    })

    it('should handle non-existent steps', () => {
      const pending = guard.getPendingCompensations(baseContext, ['nonexistent'])
      expect(pending).toEqual([])
    })
  })

  describe('real-world scenarios', () => {
    it('should prevent duplicate compensation in saga rollback', () => {
      const ctx = {
        ...baseContext,
        history: [
          {
            name: 'reserve-inventory',
            status: 'completed' as const,
            retries: 0,
          },
          {
            name: 'charge-payment',
            status: 'completed' as const,
            retries: 0,
          },
          {
            name: 'send-confirmation',
            status: 'failed' as const,
            retries: 3,
            error: 'Email service down',
          },
        ],
      }

      expect(guard.canCompensate(ctx, 'reserve-inventory')).toBe(true)
      expect(guard.canCompensate(ctx, 'charge-payment')).toBe(true)
      expect(guard.canCompensate(ctx, 'send-confirmation')).toBe(false)

      const compensatedCtx = {
        ...ctx,
        history: [
          {
            name: 'reserve-inventory',
            status: 'compensated' as const,
            retries: 0,
            compensatedAt: new Date(),
          },
          {
            name: 'charge-payment',
            status: 'completed' as const,
            retries: 0,
          },
          {
            name: 'send-confirmation',
            status: 'failed' as const,
            retries: 3,
            error: 'Email service down',
          },
        ],
      }

      expect(guard.canCompensate(compensatedCtx, 'reserve-inventory')).toBe(false)
      expect(guard.isCompensated(compensatedCtx, 'reserve-inventory')).toBe(true)
    })

    it('should track rollback progress across multiple steps', () => {
      const steps = ['step1', 'step2', 'step3', 'step4']
      let ctx: WorkflowContext<{ userId: string }, { count: number }> = {
        ...baseContext,
        history: steps.map((name) => ({
          name,
          status: 'completed' as const,
          retries: 0,
        })),
      }

      expect(guard.allCompensated(ctx, steps)).toBe(false)
      expect(guard.getPendingCompensations(ctx, steps)).toEqual(steps)

      for (const step of steps.reverse()) {
        if (guard.canCompensate(ctx, step)) {
          ctx = {
            ...ctx,
            history: ctx.history.map((h) =>
              h.name === step
                ? ({
                    ...h,
                    status: 'compensated' as const,
                    compensatedAt: new Date(),
                  } as StepExecution)
                : h
            ),
          }
        }
      }

      expect(guard.allCompensated(ctx, steps)).toBe(true)
      expect(guard.getPendingCompensations(ctx, steps)).toEqual([])
    })
  })
})
