import { DB } from '@gravito/atlas'
import { MySQLPersistence, SQLitePersistence } from '@gravito/stream'

export interface ServerConfig {
  port: number
  redisUrl: string
  queuePrefix: string
  dbDriver: 'sqlite' | 'mysql'
  dbConfig: {
    name?: string
    host?: string
    port?: number
    username?: string
    password?: string
  }
  persistence?: {
    adapter: any
    archiveCompleted: boolean
    archiveFailed: boolean
    archiveEnqueued: boolean
  }
}

export class ServerConfigManager {
  static load(): ServerConfig {
    const dbDriver = (process.env.DB_DRIVER || (process.env.DB_HOST ? 'mysql' : 'sqlite')) as
      | 'sqlite'
      | 'mysql'

    const dbConfig: ServerConfig['dbConfig'] = {}
    if (dbDriver === 'mysql') {
      dbConfig.host = process.env.DB_HOST
      dbConfig.port = parseInt(process.env.DB_PORT || '3306', 10)
      dbConfig.name = process.env.DB_NAME
      dbConfig.username = process.env.DB_USER
      dbConfig.password = process.env.DB_PASSWORD
    } else {
      dbConfig.name = process.env.DB_NAME || 'flux.sqlite'
    }

    let persistence: ServerConfig['persistence']

    if (dbDriver === 'sqlite' || process.env.DB_HOST) {
      this.setupDatabase(dbDriver, dbConfig)

      const adapter =
        dbDriver === 'sqlite'
          ? new SQLitePersistence(DB.connection())
          : new MySQLPersistence(DB.connection())
      adapter
        .setupTable()
        .catch((err) => console.error('[FluxConsole] SQL Archive Setup Error:', err))

      persistence = {
        adapter,
        archiveCompleted: process.env.PERSIST_ARCHIVE_COMPLETED === 'true',
        archiveFailed: process.env.PERSIST_ARCHIVE_FAILED !== 'false',
        archiveEnqueued: process.env.PERSIST_ARCHIVE_ENQUEUED === 'true',
      }
      console.log(`[FluxConsole] SQL Archive enabled via ${dbDriver}`)
    }

    return {
      port: parseInt(process.env.PORT || '3000', 10),
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      queuePrefix: process.env.QUEUE_PREFIX || 'queue:',
      dbDriver,
      dbConfig,
      persistence,
    }
  }

  private static setupDatabase(driver: 'sqlite' | 'mysql', config: ServerConfig['dbConfig']): void {
    if (driver === 'sqlite') {
      DB.addConnection('default', {
        driver: 'sqlite',
        database: config.name,
      })
    } else {
      DB.addConnection('default', {
        driver,
        host: config.host,
        port: config.port,
        database: config.name,
        username: config.username,
        password: config.password,
      })
    }
  }
}
