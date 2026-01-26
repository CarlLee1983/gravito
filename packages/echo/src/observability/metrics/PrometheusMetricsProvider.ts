import type { MetricsProvider } from './MetricsProvider'

/**
 * A Prometheus-compatible metrics provider.
 * Collects and formats metrics in the Prometheus text-based format.
 *
 * @example
 * ```typescript
 * const provider = new PrometheusMetricsProvider();
 * provider.increment('http_requests_total', { method: 'POST' });
 * console.log(provider.export());
 * ```
 */
export class PrometheusMetricsProvider implements MetricsProvider {
  private counters = new Map<string, Map<string, number>>()
  private histograms = new Map<string, number[]>()
  private gauges = new Map<string, number>()

  /**
   * Increments a counter for the given name and labels.
   */
  increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const counterMap = this.counters.get(name) ?? new Map()
    counterMap.set(key, (counterMap.get(key) ?? 0) + 1)
    this.counters.set(name, counterMap)
  }

  /**
   * Records a value in a histogram for the given name and labels.
   */
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const values = this.histograms.get(key) ?? []
    values.push(value)
    this.histograms.set(key, values)
  }

  /**
   * Sets a gauge to a specific value for the given name and labels.
   */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    this.gauges.set(key, value)
  }

  /**
   * Exports all collected metrics in Prometheus text format.
   *
   * @returns A string containing the formatted metrics.
   */
  export(): string {
    const lines: string[] = []

    // Export counters
    for (const [name, counterMap] of this.counters) {
      lines.push(`# TYPE ${name} counter`)
      for (const [key, value] of counterMap) {
        lines.push(`${key} ${value}`)
      }
    }

    // Export Gauges
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`)
    }

    return lines.join('\n')
  }

  /**
   * Builds a Prometheus-compatible metric key with labels.
   */
  private buildKey(name: string, labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return name
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    return `${name}{${labelStr}}`
  }
}
