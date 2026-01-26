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
}

export class MetricsCollector {
  private metrics: InternalMetrics = {
    heartbeats: { total: 0, successful: 0, failed: 0, avgDuration: 0 },
    probes: { total: 0, errors: 0, avgDuration: 0 },
    bridges: { eventsProcessed: 0, eventsDropped: 0, avgPublishDuration: 0 },
  }

  private heartbeatDurations: number[] = []
  private probeDurations: number[] = []
  private publishDurations: number[] = []

  recordHeartbeat(success: boolean, duration?: number): void {
    this.metrics.heartbeats.total++
    if (success) this.metrics.heartbeats.successful++
    else this.metrics.heartbeats.failed++

    if (duration !== undefined) {
      this.heartbeatDurations.push(duration)
      this.metrics.heartbeats.avgDuration = this.calculateAverage(this.heartbeatDurations)
    }
  }

  recordProbe(success: boolean, duration?: number): void {
    this.metrics.probes.total++
    if (!success) this.metrics.probes.errors++

    if (duration !== undefined) {
      this.probeDurations.push(duration)
      this.metrics.probes.avgDuration = this.calculateAverage(this.probeDurations)
    }
  }

  recordBridgeEvent(processed: boolean, duration?: number): void {
    if (processed) this.metrics.bridges.eventsProcessed++
    else this.metrics.bridges.eventsDropped++

    if (duration !== undefined) {
      this.publishDurations.push(duration)
      this.metrics.bridges.avgPublishDuration = this.calculateAverage(this.publishDurations)
    }
  }

  getMetrics(): InternalMetrics {
    return { ...this.metrics }
  }

  private calculateAverage(durations: number[]): number {
    if (durations.length === 0) return 0

    const maxSamples = 100
    if (durations.length > maxSamples) {
      durations.splice(0, durations.length - maxSamples)
    }

    const sum = durations.reduce((acc, d) => acc + d, 0)
    return Math.round(sum / durations.length)
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
