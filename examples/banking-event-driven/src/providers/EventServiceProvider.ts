import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { TransferSaga } from '#application/sagas/TransferSaga'
import type { AccountFrozen } from '#domain/account/events/AccountFrozen'
import type { AccountOpened } from '#domain/account/events/AccountOpened'
import type { AccountUnfrozen } from '#domain/account/events/AccountUnfrozen'
import type { MoneyDeposited } from '#domain/account/events/MoneyDeposited'
import type { MoneyWithdrawn } from '#domain/account/events/MoneyWithdrawn'
import type { TransferCompleted } from '#domain/account/events/TransferCompleted'
import type { TransferCreditApplied } from '#domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '#domain/account/events/TransferDebitApplied'
import type { TransferFailed } from '#domain/account/events/TransferFailed'
import type { TransferInitiated } from '#domain/account/events/TransferInitiated'
import type { UpdateReadModelListener } from '#infrastructure/listeners/UpdateReadModelListener'
import type { SSEManager } from '#presentation/http/SSEManager'

/**
 * Service Provider responsible for configuring event-driven logic,
 * including saga orchestration, read model updates, and real-time broadcasting.
 */
export class EventServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // Event listeners are configured in the boot method
  }

  /**
   * Initializes all event listeners and hooks.
   *
   * @param core - The PlanetCore instance.
   */
  async boot(core: PlanetCore): Promise<void> {
    const container = core.container
    const transferSaga = container.make<TransferSaga>('TransferSaga')
    const sseManager = container.make<SSEManager>('SSEManager')

    // ========================================================================
    // TransferSaga Event Listeners (Choreography Pattern)
    // We use HookManager to listen for events to avoid EventManager type constraints.
    // ========================================================================
    core.hooks.addAction('event:TransferInitiated', async (event: TransferInitiated) => {
      await transferSaga.handleTransferInitiated(event)
    })

    core.hooks.addAction('event:TransferDebitApplied', async (event: TransferDebitApplied) => {
      await transferSaga.handleTransferDebitApplied(event)
    })

    core.hooks.addAction('event:TransferCreditApplied', async (event: TransferCreditApplied) => {
      await transferSaga.handleTransferCreditApplied(event)
    })

    // ========================================================================
    // SSE Broadcasting: Stream all domain events to connected SSE clients.
    // ========================================================================
    // Broadcast AccountOpened events
    core.hooks.addAction('event:AccountOpened', (event: AccountOpened) => {
      sseManager.broadcast('AccountOpened', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast MoneyDeposited events
    core.hooks.addAction('event:MoneyDeposited', (event: MoneyDeposited) => {
      sseManager.broadcast('MoneyDeposited', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast MoneyWithdrawn events
    core.hooks.addAction('event:MoneyWithdrawn', (event: MoneyWithdrawn) => {
      sseManager.broadcast('MoneyWithdrawn', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast AccountFrozen events
    core.hooks.addAction('event:AccountFrozen', (event: AccountFrozen) => {
      sseManager.broadcast('AccountFrozen', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast AccountUnfrozen events
    core.hooks.addAction('event:AccountUnfrozen', (event: AccountUnfrozen) => {
      sseManager.broadcast('AccountUnfrozen', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast TransferInitiated events
    core.hooks.addAction('event:TransferInitiated', (event: TransferInitiated) => {
      sseManager.broadcast('TransferInitiated', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast TransferDebitApplied events
    core.hooks.addAction('event:TransferDebitApplied', (event: TransferDebitApplied) => {
      sseManager.broadcast('TransferDebitApplied', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast TransferCreditApplied events
    core.hooks.addAction('event:TransferCreditApplied', (event: TransferCreditApplied) => {
      sseManager.broadcast('TransferCreditApplied', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast TransferCompleted events
    core.hooks.addAction('event:TransferCompleted', (event: TransferCompleted) => {
      sseManager.broadcast('TransferCompleted', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // Broadcast TransferFailed events
    core.hooks.addAction('event:TransferFailed', (event: TransferFailed) => {
      sseManager.broadcast('TransferFailed', {
        aggregateId: event.aggregateId,
        payload: event.payload,
        timestamp: event.timestamp,
      })
    })

    // ========================================================================
    // ReadModelListener: Automatically update read models in response to events.
    // ========================================================================
    const readModelListener = container.make<UpdateReadModelListener>('UpdateReadModelListener')

    // Update read model on AccountOpened
    core.hooks.addAction('event:AccountOpened', (event: AccountOpened) =>
      readModelListener.handleAccountOpened(event)
    )

    // Update read model on MoneyDeposited
    core.hooks.addAction('event:MoneyDeposited', (event: MoneyDeposited) =>
      readModelListener.handleMoneyDeposited(event)
    )

    // Update read model on MoneyWithdrawn
    core.hooks.addAction('event:MoneyWithdrawn', (event: MoneyWithdrawn) =>
      readModelListener.handleMoneyWithdrawn(event)
    )

    // Update read model on AccountFrozen
    core.hooks.addAction('event:AccountFrozen', (event: AccountFrozen) =>
      readModelListener.handleAccountFrozen(event)
    )

    // Update read model on AccountUnfrozen
    core.hooks.addAction('event:AccountUnfrozen', (event: AccountUnfrozen) =>
      readModelListener.handleAccountUnfrozen(event)
    )

    // Update read model on TransferDebitApplied
    core.hooks.addAction('event:TransferDebitApplied', (event: TransferDebitApplied) =>
      readModelListener.handleTransferDebitApplied(event)
    )

    // Update read model on TransferCreditApplied
    core.hooks.addAction('event:TransferCreditApplied', (event: TransferCreditApplied) =>
      readModelListener.handleTransferCreditApplied(event)
    )

    // Update read model on TransferCompleted
    core.hooks.addAction('event:TransferCompleted', (event: TransferCompleted) =>
      readModelListener.handleTransferCompleted(event)
    )

    // Update read model on TransferFailed
    core.hooks.addAction('event:TransferFailed', (event: TransferFailed) =>
      readModelListener.handleTransferFailed(event)
    )

    console.log('[EventServiceProvider] All event listeners have been initialized.')
  }
}
