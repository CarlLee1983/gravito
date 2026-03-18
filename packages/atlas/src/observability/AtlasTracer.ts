import {
  type Attributes,
  type Context,
  context,
  type Span,
  type Tracer,
  trace,
} from '@opentelemetry/api'

export interface AtlasTracingConfig {
  enabled: boolean
  serviceName?: string
}

export class AtlasTracer {
  private tracer: Tracer | null = null
  private config: AtlasTracingConfig

  constructor(config: AtlasTracingConfig) {
    this.config = config
    if (this.config.enabled) {
      this.tracer = trace.getTracer('gravito-atlas', '1.5.0')
    }
  }

  startSpan(name: string, attributes: Attributes = {}): Span | undefined {
    if (!this.tracer || !this.config.enabled) {
      return undefined
    }

    return this.tracer.startSpan(name, {
      attributes: {
        ...attributes,
      },
    })
  }

  getActiveContext(): Context {
    return context.active()
  }
}
