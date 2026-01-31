import { beforeEach, describe, expect, it } from 'bun:test'
import { type RecoveryAction, RecoveryManager } from '../src/engine/RecoveryManager'
import type { WorkflowContext } from '../src/types'

describe('RecoveryManager', () => {
  let manager: RecoveryManager
  let mockContext: WorkflowContext<{ userId: string }, { count: number }>

  beforeEach(() => {
    manager = new RecoveryManager()
    mockContext = {
      id: 'wf-123',
      name: 'test-workflow',
      input: { userId: '456' },
      data: { count: 0 },
      status: 'rolling_back',
      currentStep: 2,
      history: [],
      version: 1,
    }
  })

  describe('onRecoveryNeeded', () => {
    it('should register recovery callbacks', () => {
      const callback = async () => {}
      manager.onRecoveryNeeded(callback)

      expect(manager.getCallbackCount()).toBe(1)
    })

    it('should support multiple callbacks', () => {
      manager.onRecoveryNeeded(async () => {})
      manager.onRecoveryNeeded(async () => {})

      expect(manager.getCallbackCount()).toBe(2)
    })
  })

  describe('notifyRecoveryNeeded', () => {
    it('should invoke all registered callbacks', async () => {
      let callCount = 0
      manager.onRecoveryNeeded(async () => {
        callCount++
      })
      manager.onRecoveryNeeded(async () => {
        callCount++
      })

      await manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Failed'))

      expect(callCount).toBe(2)
    })

    it('should pass correct parameters to callbacks', async () => {
      let capturedCtx: any
      let capturedStep: any
      let capturedError: any

      manager.onRecoveryNeeded(async (ctx, step, error) => {
        capturedCtx = ctx
        capturedStep = step
        capturedError = error
      })

      const error = new Error('Test error')
      await manager.notifyRecoveryNeeded(mockContext, 'failed-step', error)

      expect(capturedCtx).toBe(mockContext)
      expect(capturedStep).toBe('failed-step')
      expect(capturedError).toBe(error)
    })

    it('should mark recovery as pending', async () => {
      await manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Failed'))

      expect(manager.hasPendingRecovery('wf-123')).toBe(true)
    })
  })

  describe('registerAction', () => {
    it('should register retry action', () => {
      const action: RecoveryAction = { type: 'retry', maxAttempts: 5 }
      manager.registerAction('step1', action)

      expect(manager.getAction('step1')).toEqual(action)
    })

    it('should register manual action', () => {
      const handler = async () => {}
      const action: RecoveryAction = { type: 'manual', handler }
      manager.registerAction('step2', action)

      expect(manager.getAction('step2')).toEqual(action)
    })

    it('should register skip action', () => {
      const action: RecoveryAction = { type: 'skip' }
      manager.registerAction('step3', action)

      expect(manager.getAction('step3')).toEqual(action)
    })

    it('should register abort action', () => {
      const action: RecoveryAction = { type: 'abort' }
      manager.registerAction('step4', action)

      expect(manager.getAction('step4')).toEqual(action)
    })

    it('should overwrite existing action', () => {
      manager.registerAction('step1', { type: 'retry' })
      manager.registerAction('step1', { type: 'skip' })

      expect(manager.getAction('step1')).toEqual({ type: 'skip' })
    })
  })

  describe('getAction', () => {
    it('should return undefined for non-existent step', () => {
      expect(manager.getAction('nonexistent')).toBeUndefined()
    })

    it('should return registered action', () => {
      const action: RecoveryAction = { type: 'retry', maxAttempts: 3 }
      manager.registerAction('step1', action)

      expect(manager.getAction('step1')).toBe(action)
    })
  })

  describe('pending recoveries', () => {
    it('should track pending recoveries', async () => {
      await manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Error 1'))

      expect(manager.hasPendingRecovery('wf-123')).toBe(true)
      expect(manager.getPendingRecovery('wf-123')).toEqual({
        stepName: 'step1',
        error: expect.any(Error),
      })
    })

    it('should resolve pending recoveries', async () => {
      await manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Error'))

      expect(manager.hasPendingRecovery('wf-123')).toBe(true)

      manager.resolveRecovery('wf-123')

      expect(manager.hasPendingRecovery('wf-123')).toBe(false)
      expect(manager.getPendingRecovery('wf-123')).toBeUndefined()
    })

    it('should handle multiple pending recoveries', async () => {
      const ctx1 = { ...mockContext, id: 'wf-1' }
      const ctx2 = { ...mockContext, id: 'wf-2' }

      await manager.notifyRecoveryNeeded(ctx1, 'step1', new Error('Error 1'))
      await manager.notifyRecoveryNeeded(ctx2, 'step2', new Error('Error 2'))

      expect(manager.hasPendingRecovery('wf-1')).toBe(true)
      expect(manager.hasPendingRecovery('wf-2')).toBe(true)

      const all = manager.getAllPendingRecoveries()
      expect(all.size).toBe(2)
    })
  })

  describe('executeRecovery', () => {
    it('should execute manual recovery handler', async () => {
      let executed = false
      const handler = async () => {
        executed = true
      }

      manager.registerAction('step1', { type: 'manual', handler })
      await manager.executeRecovery('step1')

      expect(executed).toBe(true)
    })

    it('should throw error for non-existent action', async () => {
      await expect(manager.executeRecovery('nonexistent')).rejects.toThrow(
        'No recovery action registered for step: nonexistent'
      )
    })

    it('should not execute non-manual actions', async () => {
      manager.registerAction('step1', { type: 'retry', maxAttempts: 3 })

      await expect(manager.executeRecovery('step1')).resolves.toBeUndefined()
    })
  })

  describe('clearActions', () => {
    it('should remove all registered actions', () => {
      manager.registerAction('step1', { type: 'retry' })
      manager.registerAction('step2', { type: 'skip' })

      manager.clearActions()

      expect(manager.getAction('step1')).toBeUndefined()
      expect(manager.getAction('step2')).toBeUndefined()
    })
  })

  describe('clearCallbacks', () => {
    it('should remove all registered callbacks', () => {
      manager.onRecoveryNeeded(async () => {})
      manager.onRecoveryNeeded(async () => {})

      manager.clearCallbacks()

      expect(manager.getCallbackCount()).toBe(0)
    })
  })

  describe('clearPendingRecoveries', () => {
    it('should remove all pending recoveries', async () => {
      await manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Error'))
      await manager.notifyRecoveryNeeded(
        { ...mockContext, id: 'wf-2' },
        'step2',
        new Error('Error')
      )

      manager.clearPendingRecoveries()

      expect(manager.hasPendingRecovery('wf-123')).toBe(false)
      expect(manager.hasPendingRecovery('wf-2')).toBe(false)
      expect(manager.getAllPendingRecoveries().size).toBe(0)
    })
  })

  describe('real-world scenarios', () => {
    it('should handle payment refund failure with notification', async () => {
      let notified = false
      let notificationData: any = {}

      manager.onRecoveryNeeded(async (ctx, stepName, error) => {
        notified = true
        notificationData = {
          workflowId: ctx.id,
          step: stepName,
          error: error.message,
        }
      })

      manager.registerAction('refund-payment', {
        type: 'manual',
        handler: async () => {},
      })

      await manager.notifyRecoveryNeeded(
        mockContext,
        'refund-payment',
        new Error('Gateway timeout')
      )

      expect(notified).toBe(true)
      expect(notificationData).toEqual({
        workflowId: 'wf-123',
        step: 'refund-payment',
        error: 'Gateway timeout',
      })
      expect(manager.hasPendingRecovery('wf-123')).toBe(true)
    })

    it('should support retry action with custom attempts', () => {
      manager.registerAction('book-flight', {
        type: 'retry',
        maxAttempts: 10,
      })

      const action = manager.getAction('book-flight')
      expect(action).toEqual({ type: 'retry', maxAttempts: 10 })
    })

    it('should support skip action for non-critical steps', () => {
      manager.registerAction('send-notification', { type: 'skip' })

      const action = manager.getAction('send-notification')
      expect(action?.type).toBe('skip')
    })

    it('should support abort action for critical failures', () => {
      manager.registerAction('critical-security-check', { type: 'abort' })

      const action = manager.getAction('critical-security-check')
      expect(action?.type).toBe('abort')
    })

    it('should handle concurrent recovery notifications', async () => {
      const notifications: string[] = []

      manager.onRecoveryNeeded(async (ctx, stepName) => {
        notifications.push(`${ctx.id}:${stepName}`)
      })

      await Promise.all([
        manager.notifyRecoveryNeeded(mockContext, 'step1', new Error('Error 1')),
        manager.notifyRecoveryNeeded({ ...mockContext, id: 'wf-2' }, 'step2', new Error('Error 2')),
        manager.notifyRecoveryNeeded({ ...mockContext, id: 'wf-3' }, 'step3', new Error('Error 3')),
      ])

      expect(notifications).toHaveLength(3)
      expect(notifications).toContain('wf-123:step1')
      expect(notifications).toContain('wf-2:step2')
      expect(notifications).toContain('wf-3:step3')
    })
  })
})
