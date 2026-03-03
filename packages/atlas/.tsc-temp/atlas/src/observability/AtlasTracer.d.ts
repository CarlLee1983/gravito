import { type Context, type Span } from '@opentelemetry/api'
export interface AtlasTracingConfig {
  enabled: boolean
  serviceName?: string
}
export declare class AtlasTracer {
  private tracer
  private config
  constructor(config: AtlasTracingConfig)
  startSpan(name: string, attributes?: Record<string, any>): Span | undefined
  getActiveContext(): Context
}
