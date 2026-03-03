import { AtlasMetrics, type AtlasMetricsConfig } from './AtlasMetrics'
import { AtlasTracer, type AtlasTracingConfig } from './AtlasTracer'
export declare class AtlasObservability {
  private static instance
  tracer?: AtlasTracer
  metrics?: AtlasMetrics
  private constructor()
  static getInstance(): AtlasObservability
  initialize(config: { tracing?: AtlasTracingConfig; metrics?: AtlasMetricsConfig }): void
  static getTracer(): AtlasTracer | undefined
  static getMetrics(): AtlasMetrics | undefined
}
