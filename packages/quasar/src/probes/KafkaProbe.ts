import type { QueueProbe, QueueSnapshot } from './types'

// Minimal interface for a Kafka Consumer Admin client
export interface KafkaAdminLike {
  fetchOffsets(options: { groupId: string; topics: string[] }): Promise<
    Array<{
      topic: string
      partitions: Array<{ partition: number; offset: string; high: string; low: string }>
    }>
  >
}

export class KafkaProbe implements QueueProbe {
  constructor(
    private admin: KafkaAdminLike,
    private groupId: string,
    private topics: string[]
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    try {
      const offsets = await this.admin.fetchOffsets({
        groupId: this.groupId,
        topics: this.topics,
      })

      let totalLag = 0

      for (const topic of offsets) {
        for (const p of topic.partitions) {
          const high = parseInt(p.high, 10)
          const offset = parseInt(p.offset, 10)
          if (!isNaN(high) && !isNaN(offset)) {
            totalLag += Math.max(0, high - offset)
          }
        }
      }

      return {
        name: `${this.groupId}:${this.topics.join(',')}`,
        driver: 'kafka' as any, // Need to update QueueSnapshot driver type if strict
        size: {
          waiting: totalLag,
          active: 0, // Kafka doesn't easily expose "currently processing" without consumer metrics
          delayed: 0,
          failed: 0,
        },
      }
    } catch (err) {
      console.warn(`[KafkaProbe] Failed to fetch offsets for ${this.groupId}`, err)
      return {
        name: this.groupId,
        driver: 'kafka' as any,
        size: { waiting: 0, active: 0, failed: 0, delayed: 0 },
      }
    }
  }
}
