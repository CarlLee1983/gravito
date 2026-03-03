import type { CommandKernel } from '../CommandKernel'
import type { QueueDashboard } from '../observability/QueueDashboard'
/**
 * Register queue management commands with CommandKernel
 */
export declare function registerQueueCommands(
  kernel: CommandKernel,
  dashboard: QueueDashboard
): void
