# Workflow Orchestration Patterns

In a **Galaxy Architecture**, complex business processes often span multiple Satellites. `@gravito/flux` provides the tools to manage these long-running processes reliably.

## 1. The Saga Pattern (Distributed Transactions)

Since Satellites are decoupled and may use different databases, you cannot use a single SQL transaction for a cross-satellite process. Instead, use the **Saga Pattern**.

### Forward Steps & Compensation

A Saga consists of a sequence of steps. Each step has a forward action and a **compensation** (rollback) action.

```typescript
const checkoutSaga = createWorkflow('checkout')
  .step('reserve-inventory', async (ctx) => {
    // Call Inventory Satellite
    ctx.data.reserveId = await inventory.reserve(ctx.input.items)
  }, {
    compensate: async (ctx) => {
      // If payment fails, release the inventory
      await inventory.release(ctx.data.reserveId)
    }
  })
  .step('process-payment', async (ctx) => {
    // Call Payment Satellite
    await payment.charge(ctx.input.userId, ctx.input.total)
  })
```

## 2. Suspend & Signal (External Approvals)

Some workflows require manual intervention or asynchronous callbacks (e.g., a webhook from a payment provider).

```typescript
const onboarding = createWorkflow('onboarding')
  .step('create-account', async (ctx) => { ... })
  .step('wait-for-email-verification', async () => {
    // The workflow will pause here and the engine will release resources
    return Flux.wait('email-verified')
  })
  .step('welcome-user', async (ctx) => { ... })

// When the user clicks the link:
await flux.signal(onboarding, instanceId, 'email-verified', { timestamp: Date.now() })
```

## 3. Persistent State & Replay

Workflows are automatically persisted to the configured storage (`Atlas` or `Plasma`). If a node crashes, the `FluxEngine` can resume the workflow from the last successful step.

- **Idempotency**: Ensure your step handlers are idempotent, especially if they have side effects like sending an email.
- **Commit Steps**: Use `.commit()` for steps that MUST run and should not be rolled back.

## 4. Multi-Node Locking

When running in a cluster, use the `RedisLockProvider` (backed by `@gravito/plasma`) to ensure that only one node is executing a specific workflow instance at a time.

```typescript
new FluxEngine({
  lockProvider: new RedisLockProvider(redisClient)
})
```

## 5. Monitoring Workflow Health

Flux integrates with `@gravito/monitor` to provide metrics:
- `flux_workflow_started_total`: Count of workflows initiated.
- `flux_workflow_failed_total`: Count of persistent failures.
- `flux_step_duration_seconds`: Histogram of individual step execution times.
