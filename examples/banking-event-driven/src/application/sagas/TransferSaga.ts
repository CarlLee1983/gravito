import type { EventManager } from '@gravito/core'
import { TransferCompleted } from '../../domain/account/events/TransferCompleted'
import type { TransferCreditApplied } from '../../domain/account/events/TransferCreditApplied'
import type { TransferDebitApplied } from '../../domain/account/events/TransferDebitApplied'
import { TransferFailed } from '../../domain/account/events/TransferFailed'
import type { TransferInitiated } from '../../domain/account/events/TransferInitiated'
import type { DeadLetterListener } from '../../infrastructure/listeners/DeadLetterListener'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

export type SagaStatus = 'initiated' | 'debit_applied' | 'credit_applied' | 'completed' | 'failed'

export interface SagaState {
  transferId: string
  fromAccountId: string
  toAccountId: string
  amountCents: number
  status: SagaStatus
  createdAt: Date
}

/**
 * TransferSaga - 使用 Choreography 模式的轉帳 Saga
 * 監聽事件並依序觸發補償或繼續操作
 */
export class TransferSaga {
  private readonly sagaStates = new Map<string, SagaState>()

  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager,
    private readonly deadLetterListener: DeadLetterListener
  ) {}

  /**
   * 步驟 1: 監聽 TransferInitiated → 執行 applyTransferDebit
   */
  async handleTransferInitiated(event: TransferInitiated): Promise<void> {
    const { transferId, fromAccountId, toAccountId, amountCents } = event.payload

    // 記錄 Saga 狀態
    this.sagaStates.set(transferId, {
      transferId,
      fromAccountId,
      toAccountId,
      amountCents,
      status: 'initiated',
      createdAt: new Date(),
    })

    try {
      const fromAccount = await this.repository.findById(fromAccountId)
      if (!fromAccount) {
        throw new Error(`來源帳戶不存在: ${fromAccountId}`)
      }

      fromAccount.applyTransferDebit(amountCents, transferId)
      await this.repository.save(fromAccount)

      // 更新 Saga 狀態
      const state = this.sagaStates.get(transferId)!
      this.sagaStates.set(transferId, { ...state, status: 'debit_applied' })

      await dispatchAggregateEvents(fromAccount, this.eventManager)
    } catch (error) {
      await this.compensate(transferId, error instanceof Error ? error.message : '扣款失敗')
    }
  }

  /**
   * 步驟 2: 監聽 TransferDebitApplied → 執行 applyTransferCredit
   */
  async handleTransferDebitApplied(event: TransferDebitApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) return

    try {
      const toAccount = await this.repository.findById(state.toAccountId)
      if (!toAccount) {
        throw new Error(`目標帳戶不存在: ${state.toAccountId}`)
      }

      toAccount.applyTransferCredit(state.amountCents, transferId)
      await this.repository.save(toAccount)

      // 更新 Saga 狀態
      this.sagaStates.set(transferId, { ...state, status: 'credit_applied' })

      await dispatchAggregateEvents(toAccount, this.eventManager)
    } catch (error) {
      // 需要補償：退還已扣款
      await this.compensateWithRefund(
        transferId,
        state,
        error instanceof Error ? error.message : '入帳失敗'
      )
    }
  }

  /**
   * 步驟 3: 監聽 TransferCreditApplied → 發送 TransferCompleted
   */
  async handleTransferCreditApplied(event: TransferCreditApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) return

    this.sagaStates.set(transferId, { ...state, status: 'completed' })

    const completedEvent = new TransferCompleted(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
    })

    await this.eventManager.dispatch(completedEvent as any)
  }

  /**
   * 補償機制（無需退款時）
   */
  private async compensate(transferId: string, reason: string): Promise<void> {
    const state = this.sagaStates.get(transferId)
    if (!state) return

    this.sagaStates.set(transferId, { ...state, status: 'failed' })

    const failedEvent = new TransferFailed(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
      reason,
    })

    this.deadLetterListener.handleTransferFailed(failedEvent)
    await this.eventManager.dispatch(failedEvent as any)
  }

  /**
   * 補償機制（退還已扣款）
   */
  private async compensateWithRefund(
    transferId: string,
    state: SagaState,
    reason: string
  ): Promise<void> {
    this.sagaStates.set(transferId, { ...state, status: 'failed' })

    try {
      // 退還扣款
      const fromAccount = await this.repository.findById(state.fromAccountId)
      if (fromAccount) {
        fromAccount.deposit(state.amountCents)
        await this.repository.save(fromAccount)
        fromAccount.pullDomainEvents() // 清除退款事件，不再分發
      }
    } catch {
      // 退款失敗，記錄到 DLQ
    }

    const failedEvent = new TransferFailed(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents,
      reason,
    })

    this.deadLetterListener.handleTransferFailed(failedEvent)
    await this.eventManager.dispatch(failedEvent as any)
  }

  getSagaState(transferId: string): SagaState | null {
    return this.sagaStates.get(transferId) ?? null
  }
}
