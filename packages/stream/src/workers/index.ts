/**
 * Workers module
 *
 * 提供 Sandboxed Worker 和 Worker Pool 功能，用於在隔離的 Worker Thread 中執行 Job。
 *
 * @module workers
 */

export { SandboxedWorker, type SandboxedWorkerConfig } from './SandboxedWorker'
export { WorkerPool, type WorkerPoolConfig, type WorkerPoolStats } from './WorkerPool'
