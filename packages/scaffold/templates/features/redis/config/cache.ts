import { defineConfig } from '@gravito/core/cache'

export default defineConfig({
  default: 'redis',
  stores: {
    redis: {
      driver: 'redis',
      connection: 'default',
    },
    memory: {
      driver: 'memory',
    },
  },
})
