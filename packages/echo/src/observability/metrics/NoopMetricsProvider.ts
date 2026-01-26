import type { MetricsProvider } from './MetricsProvider'

/**
 * A non-operational implementation of {@link MetricsProvider}.
 * Used as the default provider to ensure the application remains functional
 * even if no monitoring system is configured.
 *
 * @example
 * ```typescript
 * const metrics = new NoopMetricsProvider();
 * metrics.increment('any_metric'); // Does nothing
 * ```
 */
export class NoopMetricsProvider implements MetricsProvider {
  increment(): void {}
  histogram(): void {}
  gauge(): void {}
}
