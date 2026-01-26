import type { MetricsProvider } from './MetricsProvider'

/**
 * Prometheus 格式 Metrics 收集器
 * 可搭配 prom-client 使用
 */
export class PrometheusMetricsProvider implements MetricsProvider {
  private counters = new Map<string, Map<string, number>>()
  private histograms = new Map<string, number[]>()
  private gauges = new Map<string, number>()

  increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const counterMap = this.counters.get(name) ?? new Map()
    counterMap.set(key, (counterMap.get(key) ?? 0) + 1)
    this.counters.set(name, counterMap)
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    const values = this.histograms.get(key) ?? []
    values.push(value)
    this.histograms.set(key, values)
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels)
    this.gauges.set(key, value)
  }

  /**
   * 匯出 Prometheus 格式文字
   */
  export(): string {
    const lines: string[] = []

    // 匯出計數器
    for (const [name, counterMap] of this.counters) {
      lines.push(`# TYPE ${name} counter`)
      for (const [key, value] of counterMap) {
        lines.push(`${key} ${value}`)
      }
    }

    // 匯出 Gauge
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`)
    }

    return lines.join('\n')
  }

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
