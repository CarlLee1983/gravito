import type { SitemapProgress, SitemapProgressStorage } from '../types'

/**
 * 記憶體進度儲存實作
 * 適用於單一進程或開發環境
 */
export class MemoryProgressStorage implements SitemapProgressStorage {
  private storage = new Map<string, SitemapProgress>()

  async get(jobId: string): Promise<SitemapProgress | null> {
    const progress = this.storage.get(jobId)
    return progress ? { ...progress } : null
  }

  async set(jobId: string, progress: SitemapProgress): Promise<void> {
    this.storage.set(jobId, { ...progress })
  }

  async update(jobId: string, updates: Partial<SitemapProgress>): Promise<void> {
    const existing = this.storage.get(jobId)
    if (existing) {
      this.storage.set(jobId, { ...existing, ...updates })
    }
  }

  async delete(jobId: string): Promise<void> {
    this.storage.delete(jobId)
  }

  async list(limit?: number): Promise<SitemapProgress[]> {
    const all = Array.from(this.storage.values())
    const sorted = all.sort((a, b) => {
      const aTime = a.startTime?.getTime() || 0
      const bTime = b.startTime?.getTime() || 0
      return bTime - aTime // 最新的在前
    })

    return limit ? sorted.slice(0, limit) : sorted
  }
}

