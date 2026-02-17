import type { PlanetCore } from '@gravito/core'
import type { CommandHandler } from '@gravito/enterprise'
import { Account } from '../../../Domain/Account/Account'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { CreateAccountCommand } from './CreateAccountCommand'

export class CreateAccountHandler implements CommandHandler<CreateAccountCommand, void> {
  constructor(
    private repository: IAccountRepository,
    private core: PlanetCore
  ) {}

  async handle(command: CreateAccountCommand): Promise<void> {
    const accountExists = await this.repository.existsById(command.accountId)
    if (accountExists) {
      throw new Error(`帳戶 ${command.accountId} 已存在`)
    }

    const account = Account.create(command.accountId, command.ownerName, command.currency)

    await this.repository.save(account)

    const events = account.pullDomainEvents()
    for (const event of events) {
      this.core.hooks.doAction(`cqrs:domain-event`, event)
    }
  }
}
