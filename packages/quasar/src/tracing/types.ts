export interface TracingOptions {
  enabled?: boolean
  serviceName?: string
  endpoint?: string
  sampleRate?: number
}

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
}
