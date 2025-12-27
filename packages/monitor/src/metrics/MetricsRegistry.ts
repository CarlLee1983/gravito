/**
 * @gravito/monitor - Metrics Registry
 *
 * Manages metric collection and Prometheus exposition
 */

import type { MetricOptions, MetricsConfig } from '../config'

export interface MetricValue {
  value: number
  labels: Record<string, string>
  timestamp?: number
}

const DEFAULTS = {
  prefix: 'gravito_',
  defaultMetrics: true,
  defaultLabels: {} as Record<string, string>,
}

/**
 * Counter metric - monotonically increasing value
 */
export class Counter {
  private values = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = []
  ) {}

  /**
   * Increment the counter
   */
  inc(labels: Record<string, string> = {}, delta = 1): void {
    const key = this.labelsToKey(labels)
    const current = this.values.get(key) ?? 0
    this.values.set(key, current + delta)
  }

  /**
   * Get current values
   */
  getValues(): MetricValue[] {
    const result: MetricValue[] = []
    for (const [key, value] of this.values) {
      result.push({
        value,
        labels: this.keyToLabels(key),
      })
    }
    return result
  }

  /**
   * Reset all values
   */
  reset(): void {
    this.values.clear()
  }

  private labelsToKey(labels: Record<string, string>): string {
    if (this.labelNames.length === 0) {
      return '__default__'
    }
    return this.labelNames.map((name) => `${name}=${labels[name] ?? ''}`).join(',')
  }

  private keyToLabels(key: string): Record<string, string> {
    if (key === '__default__') {
      return {}
    }
    const labels: Record<string, string> = {}
    for (const part of key.split(',')) {
      const [name, value] = part.split('=')
      if (name) {
        labels[name] = value ?? ''
      }
    }
    return labels
  }
}

/**
 * Gauge metric - value that can go up or down
 */
export class Gauge {
  private values = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = []
  ) {}

  /**
   * Set the gauge value
   */
  set(value: number, labels: Record<string, string> = {}): void {
    const key = this.labelsToKey(labels)
    this.values.set(key, value)
  }

  /**
   * Increment the gauge
   */
  inc(labels: Record<string, string> = {}, delta = 1): void {
    const key = this.labelsToKey(labels)
    const current = this.values.get(key) ?? 0
    this.values.set(key, current + delta)
  }

  /**
   * Decrement the gauge
   */
  dec(labels: Record<string, string> = {}, delta = 1): void {
    this.inc(labels, -delta)
  }

  /**
   * Get current values
   */
  getValues(): MetricValue[] {
    const result: MetricValue[] = []
    for (const [key, value] of this.values) {
      result.push({
        value,
        labels: this.keyToLabels(key),
      })
    }
    return result
  }

  private labelsToKey(labels: Record<string, string>): string {
    if (this.labelNames.length === 0) {
      return '__default__'
    }
    return this.labelNames.map((name) => `${name}=${labels[name] ?? ''}`).join(',')
  }

  private keyToLabels(key: string): Record<string, string> {
    if (key === '__default__') {
      return {}
    }
    const labels: Record<string, string> = {}
    for (const part of key.split(',')) {
      const [name, value] = part.split('=')
      if (name) {
        labels[name] = value ?? ''
      }
    }
    return labels
  }
}

/**
 * Histogram metric - tracks distribution of values
 */
export class Histogram {
  private bucketCounts = new Map<string, Map<number, number>>()
  private sums = new Map<string, number>()
  private counts = new Map<string, number>()
  public readonly buckets: number[]

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    // Sort buckets
    this.buckets = [...buckets].sort((a, b) => a - b)
  }

  /**
   * Observe a value
   */
  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.labelsToKey(labels)

    // Update sum and count
    this.sums.set(key, (this.sums.get(key) ?? 0) + value)
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)

    // Update bucket counts
    let bucketMap = this.bucketCounts.get(key)
    if (!bucketMap) {
      bucketMap = new Map()
      this.bucketCounts.set(key, bucketMap)
    }

    for (const bucket of this.buckets) {
      if (value <= bucket) {
        bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1)
      }
    }
  }

  /**
   * Start a timer and return a function to stop it
   */
  startTimer(labels: Record<string, string> = {}): () => void {
    const start = performance.now()
    return () => {
      const duration = (performance.now() - start) / 1000 // Convert to seconds
      this.observe(duration, labels)
    }
  }

  /**
   * Get values for Prometheus format
   */
  getValues(): {
    buckets: Map<string, Map<number, number>>
    sums: Map<string, number>
    counts: Map<string, number>
  } {
    return {
      buckets: this.bucketCounts,
      sums: this.sums,
      counts: this.counts,
    }
  }

  private labelsToKey(labels: Record<string, string>): string {
    if (this.labelNames.length === 0) {
      return '__default__'
    }
    return this.labelNames.map((name) => `${name}=${labels[name] ?? ''}`).join(',')
  }
}

/**
 * MetricsRegistry manages all metrics
 */
export class MetricsRegistry {
  private counters = new Map<string, Counter>()
  private gauges = new Map<string, Gauge>()
  private histograms = new Map<string, Histogram>()
  private startTime = Date.now()
  private prefix: string
  private defaultLabels: Record<string, string>
  private collectDefaultMetrics: boolean

  constructor(config: MetricsConfig = {}) {
    this.prefix = config.prefix ?? DEFAULTS.prefix
    this.defaultLabels = config.defaultLabels ?? DEFAULTS.defaultLabels
    this.collectDefaultMetrics = config.defaultMetrics ?? DEFAULTS.defaultMetrics

    if (this.collectDefaultMetrics) {
      this.initDefaultMetrics()
    }
  }

  /**
   * Create or get a counter
   */
  counter(options: MetricOptions): Counter {
    const name = this.prefix + options.name

    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter(name, options.help, options.labels))
    }

    return this.counters.get(name)!
  }

  /**
   * Create or get a gauge
   */
  gauge(options: MetricOptions): Gauge {
    const name = this.prefix + options.name

    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge(name, options.help, options.labels))
    }

    return this.gauges.get(name)!
  }

  /**
   * Create or get a histogram
   */
  histogram(options: MetricOptions): Histogram {
    const name = this.prefix + options.name

    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram(name, options.help, options.labels, options.buckets))
    }

    return this.histograms.get(name)!
  }

  /**
   * Initialize default runtime metrics
   */
  private initDefaultMetrics(): void {
    // Process uptime
    this.gauge({
      name: 'process_uptime_seconds',
      help: 'Process uptime in seconds',
    })

    // Memory usage
    this.gauge({
      name: 'nodejs_heap_size_used_bytes',
      help: 'Current heap size used in bytes',
    })

    this.gauge({
      name: 'nodejs_heap_size_total_bytes',
      help: 'Total heap size in bytes',
    })

    this.gauge({
      name: 'nodejs_external_memory_bytes',
      help: 'External memory usage in bytes',
    })

    // HTTP metrics (will be populated by middleware)
    this.counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labels: ['method', 'path', 'status'],
    })

    this.histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labels: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    })
  }

  /**
   * Update default metrics with current values
   */
  private updateDefaultMetrics(): void {
    if (!this.collectDefaultMetrics) {
      return
    }

    const uptime = (Date.now() - this.startTime) / 1000
    this.gauges.get(`${this.prefix}process_uptime_seconds`)?.set(uptime)

    const memory = process.memoryUsage()
    this.gauges.get(`${this.prefix}nodejs_heap_size_used_bytes`)?.set(memory.heapUsed)
    this.gauges.get(`${this.prefix}nodejs_heap_size_total_bytes`)?.set(memory.heapTotal)
    this.gauges.get(`${this.prefix}nodejs_external_memory_bytes`)?.set(memory.external)
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheus(): string {
    this.updateDefaultMetrics()

    const lines: string[] = []

    // Export counters
    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`)
      lines.push(`# TYPE ${counter.name} counter`)

      for (const { value, labels } of counter.getValues()) {
        const allLabels = this.formatLabels({ ...this.defaultLabels, ...labels })
        lines.push(`${counter.name}${allLabels} ${value}`)
      }
    }

    // Export gauges
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`)
      lines.push(`# TYPE ${gauge.name} gauge`)

      for (const { value, labels } of gauge.getValues()) {
        const allLabels = this.formatLabels({ ...this.defaultLabels, ...labels })
        lines.push(`${gauge.name}${allLabels} ${value}`)
      }
    }

    // Export histograms
    for (const hist of this.histograms.values()) {
      lines.push(`# HELP ${hist.name} ${hist.help}`)
      lines.push(`# TYPE ${hist.name} histogram`)

      const values = hist.getValues()

      for (const [key, bucketMap] of values.buckets) {
        const labels = this.keyToLabels(key)
        let cumulative = 0

        for (const bucket of hist.buckets) {
          cumulative += bucketMap.get(bucket) ?? 0
          const allLabels = this.formatLabels({
            ...this.defaultLabels,
            ...labels,
            le: String(bucket),
          })
          lines.push(`${hist.name}_bucket${allLabels} ${cumulative}`)
        }

        // +Inf bucket
        const infLabels = this.formatLabels({ ...this.defaultLabels, ...labels, le: '+Inf' })
        lines.push(`${hist.name}_bucket${infLabels} ${values.counts.get(key) ?? 0}`)

        // Sum and count
        const sumLabels = this.formatLabels({ ...this.defaultLabels, ...labels })
        lines.push(`${hist.name}_sum${sumLabels} ${values.sums.get(key) ?? 0}`)
        lines.push(`${hist.name}_count${sumLabels} ${values.counts.get(key) ?? 0}`)
      }
    }

    return lines.join('\n')
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels)
    if (entries.length === 0) {
      return ''
    }
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`
  }

  private keyToLabels(key: string): Record<string, string> {
    if (key === '__default__') {
      return {}
    }
    const labels: Record<string, string> = {}
    for (const part of key.split(',')) {
      const [name, value] = part.split('=')
      if (name) {
        labels[name] = value ?? ''
      }
    }
    return labels
  }
}
