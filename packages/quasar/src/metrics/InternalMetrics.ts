export interface InternalMetrics {
  heartbeats: {
    total: number
    successful: number
    failed: number
    avgDuration: number
  }
  probes: {
    total: number
    errors: number
    avgDuration: number
  }
  bridges: {
    eventsProcessed: number
    eventsDropped: number
    avgPublishDuration: number
  }
  custom?: Record<string, number>
}

export class MetricsCollector {
  private metrics: InternalMetrics = {
    heartbeats: { total: 0, successful: 0, failed: 0, avgDuration: 0 },
    probes: { total: 0, errors: 0, avgDuration: 0 },
    bridges: { eventsProcessed: 0, eventsDropped: 0, avgPublishDuration: 0 },
  }

  private customGauges: Record<string, number> = {}

  private readonly maxSamples = 100
  private heartbeatDurations = new Float64Array(this.maxSamples)
  private heartbeatIdx = 0
  private heartbeatCount = 0

  private probeDurations = new Float64Array(this.maxSamples)
  private probeIdx = 0
  private probeCount = 0

  private publishDurations = new Float64Array(this.maxSamples)
  private publishIdx = 0
  private publishCount = 0

  recordHeartbeat(success: boolean, duration?: number): void {
    this.metrics.heartbeats.total++
    if (success) {
      this.metrics.heartbeats.successful++
    } else {
      this.metrics.heartbeats.failed++
    }

    if (duration !== undefined) {
      this.heartbeatDurations[this.heartbeatIdx] = duration
      this.heartbeatIdx = (this.heartbeatIdx + 1) % this.maxSamples
      if (this.heartbeatCount < this.maxSamples) {
        this.heartbeatCount++
      }
      this.metrics.heartbeats.avgDuration = this.calculateAverage(
        this.heartbeatDurations,
        this.heartbeatCount
      )
    }
  }

  recordProbe(success: boolean, duration?: number): void {
    this.metrics.probes.total++
    if (!success) {
      this.metrics.probes.errors++
    }

    if (duration !== undefined) {
      this.probeDurations[this.probeIdx] = duration
      this.probeIdx = (this.probeIdx + 1) % this.maxSamples
      if (this.probeCount < this.maxSamples) {
        this.probeCount++
      }
      this.metrics.probes.avgDuration = this.calculateAverage(this.probeDurations, this.probeCount)
    }
  }

  recordBridgeEvent(processed: boolean, duration?: number): void {
    if (processed) {
      this.metrics.bridges.eventsProcessed++
    } else {
      this.metrics.bridges.eventsDropped++
    }

    if (duration !== undefined) {
      this.publishDurations[this.publishIdx] = duration
      this.publishIdx = (this.publishIdx + 1) % this.maxSamples
      if (this.publishCount < this.maxSamples) {
        this.publishCount++
      }
      this.metrics.bridges.avgPublishDuration = this.calculateAverage(
        this.publishDurations,
        this.publishCount
      )
    }
  }

  setGauge(name: string, value: number): void {
    this.customGauges[name] = value
  }

  getMetrics(): InternalMetrics {
    return {
      ...this.metrics,
      custom: { ...this.customGauges },
    }
  }

  private calculateAverage(durations: Float64Array, count: number): number {
    if (count === 0) {
      return 0
    }
    let sum = 0
    for (let i = 0; i < count; i++) {
      sum += durations[i]
    }
    return Math.round(sum / count)
  }

  toPrometheus(): string {
    return `
# HELP quasar_heartbeats_total Total number of heartbeats
# TYPE quasar_heartbeats_total counter
quasar_heartbeats_total{status="success"} ${this.metrics.heartbeats.successful}
quasar_heartbeats_total{status="failed"} ${this.metrics.heartbeats.failed}

# HELP quasar_heartbeat_duration_ms Average heartbeat duration in milliseconds
# TYPE quasar_heartbeat_duration_ms gauge
quasar_heartbeat_duration_ms ${this.metrics.heartbeats.avgDuration}

# HELP quasar_probes_total Total number of probe executions
# TYPE quasar_probes_total counter
quasar_probes_total{status="success"} ${this.metrics.probes.total - this.metrics.probes.errors}
quasar_probes_total{status="error"} ${this.metrics.probes.errors}

# HELP quasar_probe_duration_ms Average probe duration in milliseconds
# TYPE quasar_probe_duration_ms gauge
quasar_probe_duration_ms ${this.metrics.probes.avgDuration}

# HELP quasar_bridge_events_total Total number of bridge events
# TYPE quasar_bridge_events_total counter
quasar_bridge_events_total{status="processed"} ${this.metrics.bridges.eventsProcessed}
quasar_bridge_events_total{status="dropped"} ${this.metrics.bridges.eventsDropped}

# HELP quasar_bridge_publish_duration_ms Average bridge publish duration in milliseconds
# TYPE quasar_bridge_publish_duration_ms gauge
quasar_bridge_publish_duration_ms ${this.metrics.bridges.avgPublishDuration}
    `.trim()
  }
}
