import { defineConfig } from '@gravito/core/queue'

export default defineConfig({
  default: 'redis',
  connections: {
    redis: {
      driver: 'redis',
      connection: 'default',
      queue: 'default',
      retry_after: 90,
    },
  },
})
