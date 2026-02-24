/**
 * Consumer 管線模組 - 重新導出所有公開類型與類別。
 *
 * 供測試及進階使用者直接引用各個子元件。
 */

export { ConcurrencyGate } from './ConcurrencyGate'
export { GroupSequencer } from './GroupSequencer'
export type { HeartbeatManagerOptions } from './HeartbeatManager'
export { HeartbeatManager } from './HeartbeatManager'
export { JobExecutor } from './JobExecutor'
export { jobSourceGenerator } from './JobSourceGenerator'
export { StreamingConsumer } from './StreamingConsumer'
export type {
  ConsumerStats,
  ExecutionResult,
  ExecutorOptions,
  FetchResult,
  JobSourceOptions,
  StopSignal,
} from './types'
