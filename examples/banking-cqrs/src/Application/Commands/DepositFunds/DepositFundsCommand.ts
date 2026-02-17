import type { Command } from '@gravito/enterprise'

export class DepositFundsCommand implements Command {
  constructor(
    readonly accountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
