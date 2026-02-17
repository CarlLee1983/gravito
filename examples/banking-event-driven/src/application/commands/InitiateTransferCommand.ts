import type { EventManager } from '@gravito/core'
import { Command, type CommandHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../infrastructure/repositories/IAccountRepository'

export class InitiateTransferCommand extends Command {
  constructor(
    public readonly transferId: string,
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

export class InitiateTransferCommandHandler
  implements CommandHandler<InitiateTransferCommand, void>
{
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  async handle(command: InitiateTransferCommand): Promise<void> {
    const fromAccount = await this.repository.findById(command.fromAccountId)
    if (!fromAccount) {
      throw new Error(`來源帳戶不存在: ${command.fromAccountId}`)
    }

    const toAccount = await this.repository.findById(command.toAccountId)
    if (!toAccount) {
      throw new Error(`目標帳戶不存在: ${command.toAccountId}`)
    }

    // 發起轉帳（TransferSaga 會接手後續處理）
    fromAccount.initiateTransfer(command.transferId, command.toAccountId, command.amountCents)
    await this.repository.save(fromAccount)

    const events = fromAccount.pullDomainEvents()
    for (const event of events) {
      await this.eventManager.dispatch(event as any)
    }
  }
}
