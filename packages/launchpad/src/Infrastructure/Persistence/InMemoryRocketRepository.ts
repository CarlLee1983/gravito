import type { IRocketRepository } from '../../Domain/Interfaces'
import type { Rocket } from '../../Domain/Rocket'
import { RocketStatus } from '../../Domain/RocketStatus'

/**
 * InMemoryRocketRepository implements the `IRocketRepository` interface using an in-memory Map.
 *
 * This repository is suitable for testing or development environments where
 * persistence across restarts is not required.
 *
 * @public
 * @since 3.0.0
 */
export class InMemoryRocketRepository implements IRocketRepository {
  private rockets = new Map<string, Rocket>()

  async save(rocket: Rocket): Promise<void> {
    this.rockets.set(rocket.id, rocket)
  }

  async findById(id: string): Promise<Rocket | null> {
    return this.rockets.get(id) || null
  }

  async findIdle(): Promise<Rocket | null> {
    for (const rocket of this.rockets.values()) {
      if (rocket.status === RocketStatus.IDLE) {
        return rocket
      }
    }
    return null
  }

  async findAll(): Promise<Rocket[]> {
    return Array.from(this.rockets.values())
  }

  async delete(id: string): Promise<void> {
    this.rockets.delete(id)
  }
}
