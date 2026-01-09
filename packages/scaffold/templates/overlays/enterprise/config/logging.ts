import { defineConfig } from '@gravito/core/logging'

export default defineConfig({
  default: process.env.LOG_CHANNEL || 'stack',
  channels: {
    stack: {
      driver: 'stack',
      channels: ['daily', 'stdout'],
      ignore_exceptions: false,
    },
    single: {
      driver: 'single',
      path: 'storage/logs/gravito.log',
      level: process.env.LOG_LEVEL || 'debug',
    },
    daily: {
      driver: 'daily',
      path: 'storage/logs/gravito.log',
      level: process.env.LOG_LEVEL || 'debug',
      days: 14,
    },
    stdout: {
      driver: 'monolog',
      handler: 'Monolog\\Handler\\StreamHandler',
      with: {
        stream: 'php://stdout',
      },
      level: process.env.LOG_LEVEL || 'debug',
      formatter: 'json', // Enterprise defaults to structured JSON logging
    },
  },
})
