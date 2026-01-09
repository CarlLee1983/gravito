import type { CacheService } from '@gravito/core'
import type { IRocketRepository } from '../../Domain/Interfaces'
import { Rocket } from '../../Domain/Rocket'

export class CachedRocketRepository implements IRocketRepository {
  private CACHE_KEY = 'launchpad:rockets'

  constructor(private cache: CacheService) {}

  private async getMap(): Promise<Map<string, any>> {
    const data = await this.cache.get<Record<string, any>>(this.CACHE_KEY)
    return new Map(Object.entries(data || {}))
  }

  async save(rocket: Rocket): Promise<void> {
    const map = await this.getMap()
    map.set(rocket.id, rocket.toJSON())
    await this.cache.set(this.CACHE_KEY, Object.fromEntries(map))
  }

  async findById(id: string): Promise<Rocket | null> {
    const map = await this.getMap()
    const data = map.get(id)
    return data ? Rocket.fromJSON(data) : null
  }

  async findIdle(): Promise<Rocket | null> {
    const rockets = await this.findAll()
    return rockets.find((r) => r.status === 'IDLE') || null
  }

  async findAll(): Promise<Rocket[]> {
    const map = await this.getMap()
    return Array.from(map.values()).map((data) => Rocket.fromJSON(data))
  }

  async delete(id: string): Promise<void> {
    const map = await this.getMap()
    map.delete(id)
    await this.cache.set(this.CACHE_KEY, Object.fromEntries(map))
  }
}
