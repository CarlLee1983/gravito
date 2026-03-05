import type { Blog } from '../../Domain/Aggregates/Blog'
import type { IBlogRepository } from '../../Domain/Contracts/IBlogRepository'
import type { BlogId } from '../../Domain/ValueObjects/BlogId'

export class AtlasBlogRepository implements IBlogRepository {
  async save(entity: Blog): Promise<void> {
    // Implementation using @gravito/atlas
    console.log('[Atlas] Saving aggregate:', entity.id.value)
  }

  async findById(_id: BlogId): Promise<Blog | null> {
    return null
  }

  async findAll(): Promise<Blog[]> {
    return []
  }

  async delete(_id: BlogId): Promise<void> {}

  async exists(_id: BlogId): Promise<boolean> {
    return false
  }
}
