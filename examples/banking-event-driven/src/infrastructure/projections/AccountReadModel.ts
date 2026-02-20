export interface AccountRecord {
  id: string
  ownerName: string
  balanceCents: number
  status: 'active' | 'frozen'
  currency: string
  createdAt: Date
}

export class AccountReadModel {
  private readonly store = new Map<string, AccountRecord>()

  addAccount(record: AccountRecord): void {
    this.store.set(record.id, { ...record })
  }

  updateBalance(id: string, balanceCents: number): void {
    const existing = this.store.get(id)
    if (existing) {
      this.store.set(id, { ...existing, balanceCents })
    }
  }

  updateStatus(id: string, status: 'active' | 'frozen'): void {
    const existing = this.store.get(id)
    if (existing) {
      this.store.set(id, { ...existing, status })
    }
  }

  findById(id: string): AccountRecord | null {
    return this.store.get(id) ?? null
  }

  findAll(limit = 20, offset = 0): AccountRecord[] {
    const all = Array.from(this.store.values())
    return all.slice(offset, offset + limit)
  }

  count(): number {
    return this.store.size
  }
}
