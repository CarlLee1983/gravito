export interface AccountBalanceDTO {
  accountId: string
  ownerName: string
  balanceCents: number
  balanceDollars: number
  currency: string
  status: string
  createdAt: Date
}
