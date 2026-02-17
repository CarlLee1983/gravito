import type { Command } from '@gravito/enterprise'

export class WithdrawFundsCommand implements Command {
  constructor(
    readonly accountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
