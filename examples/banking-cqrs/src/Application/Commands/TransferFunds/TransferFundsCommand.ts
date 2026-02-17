import type { Command } from '@gravito/enterprise'

export class TransferFundsCommand implements Command {
  constructor(
    readonly fromAccountId: string,
    readonly toAccountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
