import type { Command } from '@gravito/enterprise'

export class CreateAccountCommand implements Command {
  constructor(
    readonly accountId: string,
    readonly ownerName: string,
    readonly currency: string = 'TWD'
  ) {}
}
