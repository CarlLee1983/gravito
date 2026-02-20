import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { TransferSaga } from '../application/sagas/TransferSaga'
import type { TransferCreditApplied } from '../domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '../domain/account/events/TransferDebitApplied'
import type { TransferInitiated } from '../domain/account/events/TransferInitiated'
import type { UpdateReadModelListener } from '../infrastructure/listeners/UpdateReadModelListener'
import type { SSEManager } from '../presentation/http/SSEManager'
export class EventServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // 事件監聽器在 boot 中設定
  }

  async boot(core: PlanetCore): Promise<void> {
    const container = core.container
    const transferSaga = container.make<TransferSaga>('TransferSaga')
    const sseManager = container.make<SSEManager>('SSEManager')

    // ========================================================================
    // TransferSaga 事件監聽（Choreography 模式）
    // 使用 HookManager 監聽事件，避免 EventManager 的類型限制
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
    // SSE 廣播：將所有領域事件廣播至 SSE 客戶端
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
    // ReadModelListener 事件監聽（自動更新讀取模型）
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

    console.log('[EventServiceProvider] 所有事件監聽器已啟動')
  }
}
