import type { IMarketingRepository } from '../../Domain/Contracts/IMarketingRepository'
import type { Marketing } from '../../Domain/Entities/Marketing'

export class AtlasMarketingRepository implements IMarketingRepository {
  async save(entity: Marketing): Promise<void> {
    // Dogfooding: Use @gravito/atlas for persistence
    console.log('[Atlas] Saving entity:', entity.id)
    // await DB.table('marketings').insert({ ... })
  }

  async findById(_id: string): Promise<Marketing | null> {
    return null
  }

  async findAll(): Promise<Marketing[]> {
    return []
  }

  async delete(_id: string): Promise<void> {}

  async exists(_id: string): Promise<boolean> {
    return false
  }
}
