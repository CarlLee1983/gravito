import app from './app'
import database from './database'
import monitoring from './monitoring'
import redis from './redis'

/**
 * 導出完整配置
 */
export default {
  ...app,
  database,
  redis,
  ...monitoring,
}
