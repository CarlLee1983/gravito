import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { TransferSaga } from '#application/sagas/TransferSaga'
import type { TransferCreditApplied } from '#domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '#domain/account/events/TransferDebitApplied'
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
    const sseEvents = [
      'AccountOpened',
      'MoneyDeposited',
      'MoneyWithdrawn',
      'AccountFrozen',
      'AccountUnfrozen',
      'TransferInitiated',
      'TransferDebitApplied',
      'TransferCreditApplied',
      'TransferCompleted',
      'TransferFailed',
    ]

    for (const eventName of sseEvents) {
      core.hooks.addAction(`event:${eventName}`, (event: any) => {
        sseManager.broadcast(eventName, {
          aggregateId: event.aggregateId,
          payload: event.payload,
          timestamp: event.timestamp || event.occurredOn,
        })
      })
    }

    // ========================================================================
    // ReadModelListener: Automatically update read models in response to events.
    // ========================================================================
    const readModelListener = container.make<UpdateReadModelListener>('UpdateReadModelListener')

    core.hooks.addAction('event:AccountOpened', (event: any) =>
      readModelListener.handleAccountOpened(event)
    )
    core.hooks.addAction('event:MoneyDeposited', (event: any) =>
      readModelListener.handleMoneyDeposited(event)
    )
    core.hooks.addAction('event:MoneyWithdrawn', (event: any) =>
      readModelListener.handleMoneyWithdrawn(event)
    )
    core.hooks.addAction('event:AccountFrozen', (event: any) =>
      readModelListener.handleAccountFrozen(event)
    )
    core.hooks.addAction('event:AccountUnfrozen', (event: any) =>
      readModelListener.handleAccountUnfrozen(event)
    )
    core.hooks.addAction('event:TransferDebitApplied', (event: any) =>
      readModelListener.handleTransferDebitApplied(event)
    )
    core.hooks.addAction('event:TransferCreditApplied', (event: any) =>
      readModelListener.handleTransferCreditApplied(event)
    )
    core.hooks.addAction('event:TransferCompleted', (event: any) =>
      readModelListener.handleTransferCompleted(event)
    )
    core.hooks.addAction('event:TransferFailed', (event: any) =>
      readModelListener.handleTransferFailed(event)
    )

    console.log('[EventServiceProvider] All event listeners have been initialized.')
  }
}
