export * from './AtlasMetrics'
export * from './AtlasObservability'
export * from './AtlasTracer'
export interface AtlasObservabilityConfig {
  enabled: boolean
  tracing?: boolean
  metrics?: boolean
  serviceName?: string
}
