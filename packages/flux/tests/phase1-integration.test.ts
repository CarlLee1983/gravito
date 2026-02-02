import { beforeEach, describe, expect, it, jest } from 'bun:test'
import { createWorkflow, FluxEngine, MemoryStorage } from '../src'
import { ContextManager } from '../src/core/ContextManager'
import { IdempotencyGuard } from '../src/core/IdempotencyGuard'
import { CompensationRetryPolicy } from '../src/engine/CompensationRetryPolicy'
import { RecoveryManager } from '../src/engine/RecoveryManager'
import { RollbackManager } from '../src/engine/RollbackManager'
import { TraceEmitter } from '../src/engine/TraceEmitter'

describe('Phase 1 Integration: Risk Mitigation', () => {
  let engine: FluxEngine
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()

    const retryPolicy = new CompensationRetryPolicy({
      maxAttempts: 3,
      initialDelay: 10,
      backoffCoefficient: 2,
      maxDelay: 100,
      jitter: 0.1,
    })

    const idempotencyGuard = new IdempotencyGuard()
    const recoveryManager = new RecoveryManager()
    const contextManager = new ContextManager()
    const traceEmitter = new TraceEmitter()

    const rollbackManager = new RollbackManager(storage, contextManager, traceEmitter, undefined, {
      retryPolicy,
      idempotencyGuard,
      recoveryManager,
    })

    engine = new FluxEngine({
      storage,
      defaultRetries: 0,
      defaultTimeout: 5000,
    })

    ;(engine as any).rollbackManager = rollbackManager
  })

  describe('Data Optimization + Incremental Persistence', () => {
    it('should optimize large objects automatically', async () => {
      const largeData = { payload: 'x'.repeat(20000) }

      const workflow = createWorkflow('data-optimization-test')
        .step('create-large-data', async (ctx) => {
          ctx.data.largeObject = largeData
        })
        .step('process', async (ctx) => {
          expect(ctx.data.largeObject).toEqual(largeData)
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('completed')
      expect(result.data.largeObject).toEqual(largeData)
    })

    it('should use incremental persistence for state updates', async () => {
      let saveCount = 0
      const customStorage = new MemoryStorage()
      const originalSave = customStorage.save.bind(customStorage)
      customStorage.save = jest.fn(async (state) => {
        saveCount++
        return originalSave(state)
      })

      const customEngine = new FluxEngine({ storage: customStorage, defaultRetries: 0 })

      const workflow = createWorkflow('incremental-persistence-test')
        .step('step1', async (ctx) => {
          ctx.data.value = 1
        })
        .step('step2', async (ctx) => {
          ctx.data.value = 2
        })
        .step('step3', async (ctx) => {
          ctx.data.value = 3
        })

      await customEngine.execute(workflow, {})

      expect(saveCount).toBeGreaterThan(0)
    })
  })

  describe('Compensation with Retry + Idempotency', () => {
    it('should retry failed compensation automatically', async () => {
      let compensationAttempts = 0

      const workflow = createWorkflow('retry-compensation-test')
        .step(
          'step1',
          async (ctx) => {
            ctx.data.reserved = true
          },
          {
            compensate: async () => {
              compensationAttempts++
              if (compensationAttempts < 3) {
                throw new Error('Transient failure')
              }
            },
          }
        )
        .step('step2', async () => {
          throw new Error('Step 2 failed')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('rolled_back')
      expect(compensationAttempts).toBe(3)
      expect(result.history[0].status).toBe('compensated')
    })

    it('should prevent duplicate compensation on retry', async () => {
      let compensationCount = 0

      const workflow = createWorkflow('idempotency-test')
        .step(
          'payment',
          async (ctx) => {
            ctx.data.charged = 100
          },
          {
            compensate: async () => {
              compensationCount++
            },
          }
        )
        .step('fulfill', async () => {
          throw new Error('Fulfillment failed')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('rolled_back')
      expect(compensationCount).toBe(1)

      const state = await storage.load(result.id)
      expect(state?.history[0].status).toBe('compensated')
    })

    it('should handle permanent compensation failure', async () => {
      const workflow = createWorkflow('permanent-failure-test')
        .step(
          'step1',
          async (ctx) => {
            ctx.data.action = 'done'
          },
          {
            compensate: async () => {
              throw new Error('Permanent compensation failure')
            },
          }
        )
        .step('step2', async () => {
          throw new Error('Step 2 failed')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('compensation_failed')
      expect(result.history[0].status).toBe('compensating')
    })
  })

  describe('End-to-End: E-commerce Order Rollback', () => {
    it('should handle complex order cancellation with retries', async () => {
      const inventory: string[] = []
      const payments: number[] = []
      const emails: string[] = []

      let inventoryReleaseAttempts = 0
      let refundAttempts = 0

      const workflow = createWorkflow('order-workflow')
        .input<{ productId: string; userId: string; amount: number }>()
        .step(
          'reserve-inventory',
          async (ctx) => {
            inventory.push(ctx.input.productId)
            ctx.data.reservationId = `res-${ctx.input.productId}`
          },
          {
            compensate: async (ctx) => {
              inventoryReleaseAttempts++
              if (inventoryReleaseAttempts < 2) {
                throw new Error('Inventory service timeout')
              }
              const index = inventory.indexOf(ctx.input.productId)
              if (index > -1) {
                inventory.splice(index, 1)
              }
            },
          }
        )
        .step(
          'charge-payment',
          async (ctx) => {
            payments.push(ctx.input.amount)
            ctx.data.transactionId = `tx-${Date.now()}`
          },
          {
            compensate: async (ctx) => {
              refundAttempts++
              if (refundAttempts < 2) {
                throw new Error('Payment gateway timeout')
              }
              const index = payments.indexOf(ctx.input.amount)
              if (index > -1) {
                payments.splice(index, 1)
              }
            },
          }
        )
        .step(
          'send-confirmation',
          async (ctx) => {
            emails.push(ctx.input.userId)
          },
          {
            compensate: async (ctx) => {
              const index = emails.indexOf(ctx.input.userId)
              if (index > -1) {
                emails.splice(index, 1)
              }
            },
          }
        )
        .step('ship', async () => {
          throw new Error('Shipping service unavailable')
        })

      const result = await engine.execute(workflow, {
        productId: 'SKU-123',
        userId: 'user-456',
        amount: 99,
      })

      expect(result.status).toBe('rolled_back')

      expect(inventory).toHaveLength(0)
      expect(payments).toHaveLength(0)
      expect(emails).toHaveLength(0)

      expect(inventoryReleaseAttempts).toBe(2)
      expect(refundAttempts).toBe(2)

      expect(result.history[0].status).toBe('compensated')
      expect(result.history[1].status).toBe('compensated')
      expect(result.history[2].status).toBe('compensated')
      expect(result.history[3].status).toBe('failed')
    })

    it('should handle partial rollback with data preservation', async () => {
      const logs: string[] = []

      const workflow = createWorkflow('partial-rollback-test')
        .step(
          'step1',
          async (ctx) => {
            ctx.data.step1Complete = true
            logs.push('step1-execute')
          },
          {
            compensate: async () => {
              logs.push('step1-compensate')
            },
          }
        )
        .step(
          'step2',
          async (ctx) => {
            ctx.data.step2Complete = true
            logs.push('step2-execute')
          },
          {
            compensate: async () => {
              logs.push('step2-compensate')
            },
          }
        )
        .step(
          'step3',
          async (ctx) => {
            ctx.data.step3Complete = true
            logs.push('step3-execute')
          },
          {
            compensate: async () => {
              logs.push('step3-compensate')
            },
          }
        )
        .step('step4', async () => {
          logs.push('step4-execute')
          throw new Error('Step 4 failed')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('rolled_back')

      expect(logs).toEqual([
        'step1-execute',
        'step2-execute',
        'step3-execute',
        'step4-execute',
        'step3-compensate',
        'step2-compensate',
        'step1-compensate',
      ])

      expect(result.data.step1Complete).toBe(true)
      expect(result.data.step2Complete).toBe(true)
      expect(result.data.step3Complete).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle workflow with no compensations needed', async () => {
      const workflow = createWorkflow('no-compensation-test')
        .step('step1', async (ctx) => {
          ctx.data.value = 1
        })
        .step('step2', async (ctx) => {
          ctx.data.value = 2
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('completed')
      expect(result.data.value).toBe(2)
    })

    it('should handle workflow with all steps having compensations', async () => {
      const compensationOrder: number[] = []

      const workflow = createWorkflow('all-compensations-test')
        .step('step1', async () => {}, {
          compensate: async () => {
            compensationOrder.push(1)
          },
        })
        .step('step2', async () => {}, {
          compensate: async () => {
            compensationOrder.push(2)
          },
        })
        .step('step3', async () => {}, {
          compensate: async () => {
            compensationOrder.push(3)
          },
        })
        .step('step4', async () => {
          throw new Error('Fail')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('rolled_back')
      expect(compensationOrder).toEqual([3, 2, 1])
    })

    it('should handle compensation with context data access', async () => {
      let compensatedData: any = null

      const workflow = createWorkflow('context-access-test')
        .step(
          'create-resource',
          async (ctx) => {
            ctx.data.resourceId = 'resource-123'
            ctx.data.metadata = { createdAt: new Date().toISOString() }
          },
          {
            compensate: async (ctx) => {
              compensatedData = {
                resourceId: ctx.data.resourceId,
                metadata: ctx.data.metadata,
              }
            },
          }
        )
        .step('fail', async () => {
          throw new Error('Deliberate failure')
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('rolled_back')
      expect(compensatedData).not.toBeNull()
      expect(compensatedData.resourceId).toBe('resource-123')
      expect(compensatedData.metadata).toHaveProperty('createdAt')
    })
  })

  describe('Performance and Scale', () => {
    it('should handle workflows with many steps efficiently', async () => {
      const stepCount = 50
      const workflow = createWorkflow('large-workflow-test')

      for (let i = 0; i < stepCount; i++) {
        workflow.step(`step-${i}`, async (ctx) => {
          ctx.data[`step${i}`] = i
        })
      }

      const startTime = Date.now()
      const result = await engine.execute(workflow, {})
      const duration = Date.now() - startTime

      expect(result.status).toBe('completed')
      expect(result.history).toHaveLength(stepCount)
      expect(duration).toBeLessThan(5000)
    })

    it('should handle large data payloads efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }))

      const workflow = createWorkflow('large-data-test')
        .step('load-data', async (ctx) => {
          ctx.data.items = largeArray
        })
        .step('process-data', async (ctx) => {
          ctx.data.processed = ctx.data.items.length
        })

      const result = await engine.execute(workflow, {})

      expect(result.status).toBe('completed')
      expect(result.data.processed).toBe(10000)
    })
  })
})
