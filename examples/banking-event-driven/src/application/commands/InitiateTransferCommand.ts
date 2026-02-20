import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'
import { dispatchAggregateEvents } from '../utils/EventDispatcher'

/**
 * Command to initiate a fund transfer between two accounts.
 * The actual transfer logic is managed by a Saga orchestration.
 */
export class InitiateTransferCommand extends Command {
  /**
   * @param transferId - Unique identifier for the transfer transaction.
   * @param fromAccountId - Source account ID to debit.
   * @param toAccountId - Target account ID to credit.
   * @param amountCents - Amount to transfer in cents.
   */
  constructor(
    public readonly transferId: string,
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

/**
 * Handles the initiation of a fund transfer.
 */
export class InitiateTransferCommandHandler
  implements CommandHandler<InitiateTransferCommand, void>
{
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  /**
   * Executes the initiation of a transfer.
   *
   * @param command - The transfer initiation command.
   * @throws {Error} If source or target account does not exist.
   */
  async handle(command: InitiateTransferCommand): Promise<void> {
    const fromAccount = await this.repository.findById(command.fromAccountId)
    if (!fromAccount) {
      throw new Error(`Source account not found: ${command.fromAccountId}`)
    }

    const toAccount = await this.repository.findById(command.toAccountId)
    if (!toAccount) {
      throw new Error(`Target account not found: ${command.toAccountId}`)
    }

    // Initiate the transfer (TransferSaga will handle the subsequent steps)
    fromAccount.initiateTransfer(command.transferId, command.toAccountId, command.amountCents)
    await this.repository.save(fromAccount)
    await dispatchAggregateEvents(fromAccount, this.eventManager)
  }
}
