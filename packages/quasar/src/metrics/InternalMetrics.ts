export interface InternalMetrics {
  heartbeats: {
    total: number
    successful: number
    failed: number
  }
  probes: {
    total: number
    errors: number
  }
  bridges: {
    eventsProcessed: number
    eventsDropped: number
  }
}

export class MetricsCollector {
  private metrics: InternalMetrics = {
    heartbeats: { total: 0, successful: 0, failed: 0 },
    probes: { total: 0, errors: 0 },
    bridges: { eventsProcessed: 0, eventsDropped: 0 },
  }

  recordHeartbeat(success: boolean): void {
    this.metrics.heartbeats.total++
    if (success) this.metrics.heartbeats.successful++
    else this.metrics.heartbeats.failed++
  }

  recordProbe(success: boolean): void {
    this.metrics.probes.total++
    if (!success) this.metrics.probes.errors++
  }

  recordBridgeEvent(processed: boolean): void {
    if (processed) this.metrics.bridges.eventsProcessed++
    else this.metrics.bridges.eventsDropped++
  }

  getMetrics(): InternalMetrics {
    return { ...this.metrics }
  }
}
