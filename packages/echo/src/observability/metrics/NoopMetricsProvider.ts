import type { MetricsProvider } from './MetricsProvider'

/**
 * 空操作 Metrics（預設）
 */
export class NoopMetricsProvider implements MetricsProvider {
  increment(): void {}
  histogram(): void {}
  gauge(): void {}
}
