import type { IPaymentRepository } from '../../Domain/Contracts/IPaymentRepository'
import type { Payment } from '../../Domain/Entities/Payment'

export class AtlasPaymentRepository implements IPaymentRepository {
  async save(entity: Payment): Promise<void> {
    // Dogfooding: Use @gravito/atlas for persistence
    console.log('[Atlas] Saving entity:', entity.id)
    // await DB.table('payments').insert({ ... })
  }

  async findById(_id: string): Promise<Payment | null> {
    return null
  }

  async findAll(): Promise<Payment[]> {
    return []
  }

  async delete(_id: string): Promise<void> {}

  async exists(_id: string): Promise<boolean> {
    return false
  }
}
