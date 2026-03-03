/**
 * Redis 配置
 */
export default {
  default: 'cache',
  connections: {
    cache: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  },
}
