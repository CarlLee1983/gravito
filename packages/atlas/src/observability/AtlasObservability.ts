import { AtlasMetrics, type AtlasMetricsConfig } from './AtlasMetrics'
import { AtlasTracer, type AtlasTracingConfig } from './AtlasTracer'

export class AtlasObservability {
  private static instance: AtlasObservability

  public tracer?: AtlasTracer
  public metrics?: AtlasMetrics

  private constructor() {}

  static getInstance(): AtlasObservability {
    if (!AtlasObservability.instance) {
      AtlasObservability.instance = new AtlasObservability()
    }
    return AtlasObservability.instance
  }

  initialize(config: { tracing?: AtlasTracingConfig; metrics?: AtlasMetricsConfig }) {
    if (config.tracing) {
      this.tracer = new AtlasTracer(config.tracing)
    }
    if (config.metrics) {
      this.metrics = new AtlasMetrics(config.metrics)
    }
  }

  static getTracer(): AtlasTracer | undefined {
    return AtlasObservability.getInstance().tracer
  }

  static getMetrics(): AtlasMetrics | undefined {
    return AtlasObservability.getInstance().metrics
  }
}
