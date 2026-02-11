/**
 * Reporting Module - Public API
 * 報表系統公開接口
 */

export type {
  DistributionConfig,
  DistributionJob,
  DistributionPreferences,
  DistributionResult,
  Recipient,
} from './ReportDistributionManager'
export { ReportDistributionManager } from './ReportDistributionManager'

export type {
  ReportField,
  ReportFilter,
  ReportGenerationConfig,
  ReportGenerationResult,
  ReportTemplate,
} from './ReportGenerationEngine'
export { ReportGenerationEngine } from './ReportGenerationEngine'
export type {
  JobResult,
  QueueStats,
  ReportJob,
  ReportQueueConfig,
} from './ReportQueueManager'
export { ReportQueueManager } from './ReportQueueManager'
export type {
  ReportQuery,
  StorageConfig,
  StorageStats,
  StoredReport,
} from './ReportStorageManager'
export { ReportStorageManager } from './ReportStorageManager'
