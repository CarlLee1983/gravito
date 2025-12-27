import type { Entity } from './Entity'

export interface Repository<TEntity extends Entity<TId>, TId> {
  save(entity: TEntity): Promise<void>
  findById(id: TId): Promise<TEntity | null>
  findAll(): Promise<TEntity[]>
  delete(id: TId): Promise<void>
  exists(id: TId): Promise<boolean>
}
