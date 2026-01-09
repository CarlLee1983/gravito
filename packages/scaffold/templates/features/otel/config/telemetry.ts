import { defineConfig } from '@gravito/core/telemetry'

export default defineConfig({
  enabled: process.env.OTEL_ENABLED !== 'false',
  service_name: process.env.APP_NAME || 'gravito-app',
  exporter: {
    type: 'otlp', // or 'console'
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  },
})
