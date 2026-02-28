import { UseCase } from '@gravito/enterprise'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../Domain/Contracts/IAnalyticsRepository'
import { DashboardContext, type DashboardInput } from '../../Domain/DCI/Contexts/DashboardContext'
import { MetricQueryContext } from '../../Domain/DCI/Contexts/MetricQueryContext'
import type { AnalyticsReportDTO } from '../DTOs/AnalyticsDTO'
import { AnalyticsMapper } from '../DTOs/AnalyticsDTO'

export class LoadDashboard extends UseCase<DashboardInput, AnalyticsReportDTO[]> {
  constructor(
    private readonly dataPointRepo: IDataPointRepository,
    private readonly reportRepo: IReportRepository
  ) {
    super()
  }

  async execute(input: DashboardInput): Promise<AnalyticsReportDTO[]> {
    const queryCtx = new MetricQueryContext(this.dataPointRepo, this.reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)
    const reports = await dashboardCtx.loadDashboard(input)
    return reports.map((report) => AnalyticsMapper.toReportDTO(report))
  }
}
