import { join } from 'node:path'
import { DB, Migrator } from '@gravito/atlas'
import { bodySizeLimit, defineConfig, PlanetCore, securityHeaders } from '@gravito/core'
import { registerRoutes } from './routes'

const DEFAULT_PORT = Number(process.env.PORT ?? '3001')
const MIGRATIONS_PATH = join(process.cwd(), 'src', 'database', 'migrations')

function resolveDatabaseConfig(rawUrl?: string) {
  const url = (rawUrl ?? process.env.DATABASE_URL ?? 'sqlite:./demo.db').trim()

  if (url.toLowerCase().startsWith('sqlite:')) {
    const pathPart = url.slice('sqlite:'.length)
    if (pathPart === ':memory:') {
      return {
        driver: 'sqlite',
        database: ':memory:',
      }
    }
    const normalizedPath = pathPart.replace(/^\/+/, '/')
    const database = normalizedPath === '' ? './demo.db' : normalizedPath
    const normalized = database.startsWith('/') ? database : join(process.cwd(), database)
    return {
      driver: 'sqlite',
      database: normalized,
    }
  }

  try {
    const parsed = new URL(url)
    let driver = parsed.protocol.replace(':', '')
    if (driver === 'postgresql') {
      driver = 'postgres'
    }

    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined
    const config: Record<string, unknown> = {
      driver,
    }

    if (database) {
      config.database = database
    }
    if (parsed.hostname) {
      config.host = parsed.hostname
    }
    if (parsed.port) {
      config.port = Number(parsed.port)
    }
    if (parsed.username) {
      config.username = decodeURIComponent(parsed.username)
    }
    if (parsed.password) {
      config.password = decodeURIComponent(parsed.password)
    }

    return config
  } catch {
    return {
      driver: 'sqlite',
      database: join(process.cwd(), 'demo.db'),
    }
  }
}

async function migrate() {
  const migrator = new Migrator({ path: MIGRATIONS_PATH })
  await migrator.run()
}

export async function bootstrap() {
  DB.configure({
    default: 'default',
    connections: {
      default: resolveDatabaseConfig(),
    },
  })

  try {
    await migrate()
  } catch (error) {
    console.error('Failed to run migrations:', error)
    throw error
  }

  const config = defineConfig({
    config: {
      PORT: DEFAULT_PORT,
      APP_NAME: process.env.APP_NAME ?? 'Gravito Workflow Demo',
      APP_VERSION: process.env.APP_VERSION ?? '0.1.0',
      VIEW_DIR: 'src/views',
    },
    orbits: [],
  })

  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  const defaultCsp =
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  core.adapter.use(
    '*',
    securityHeaders({
      contentSecurityPolicy: process.env.APP_CSP === 'false' ? false : defaultCsp,
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
    })
  )

  const limit = Number(process.env.APP_BODY_LIMIT ?? '1048576')
  if (limit > 0) {
    core.adapter.use('*', bodySizeLimit(limit))
  }

  registerRoutes(core)

  return core
}
