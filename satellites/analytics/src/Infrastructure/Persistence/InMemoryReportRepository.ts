import type { IReportRepository } from '../../Domain/Contracts/IAnalyticsRepository'
import type { AnalyticsReport } from '../../Domain/Entities/AnalyticsReport'

export class InMemoryReportRepository implements IReportRepository {
  private reports: Map<string, AnalyticsReport> = new Map()

  async save(report: AnalyticsReport): Promise<void> {
    this.reports.set(report.id, report)
  }

  async findById(id: string): Promise<AnalyticsReport | null> {
    return this.reports.get(id) ?? null
  }

  async findRecent(limit: number): Promise<AnalyticsReport[]> {
    return Array.from(this.reports.values()).slice(-limit)
  }

  async delete(id: string): Promise<void> {
    this.reports.delete(id)
  }

  clear(): void {
    this.reports.clear()
  }
}
