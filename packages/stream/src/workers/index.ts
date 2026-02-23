/**
 * Workers module
 *
 * 提供 Sandboxed Worker 和 Worker Pool 功能，用於在隔離的 Worker Thread 中執行 Job。
 * 支持 Node.js Worker Threads 和 Bun Workers，具有自動運行時檢測。
 *
 * @module workers
 */

export { BunWorker, type BunWorkerConfig } from './BunWorker'
export { SandboxedWorker, type SandboxedWorkerConfig } from './SandboxedWorker'
export {
  createWorkerFactory,
  type IWorkerFactory,
  RuntimeAwareWorkerFactory,
  type RuntimeEnvironment,
  type Worker as FactoryWorker,
  type WorkerConfig,
} from './WorkerFactory'
export { WorkerPool, type WorkerPoolConfig, type WorkerPoolStats } from './WorkerPool'
