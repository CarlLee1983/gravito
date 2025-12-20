import { OrbitCache } from '@gravito/orbit-cache'
import { OrbitDB } from '@gravito/orbit-db'
import { OrbitInertia } from '@gravito/orbit-inertia'
import { OrbitMail } from '@gravito/orbit-mail'
import { OrbitQueue } from '@gravito/orbit-queue'
import { OrbitView } from '@gravito/orbit-view'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { defineConfig, PlanetCore } from 'gravito-core'
import { serveStatic } from 'hono/bun'
import { registerHooks } from './hooks'
import { registerRoutes } from './routes'

export interface AppConfig {
  port?: number
  name?: string
  version?: string
}

export async function bootstrap(options: AppConfig = {}) {
  const { port = 3000, name = 'Gravito App', version = '1.0.0' } = options

  // Initialize SQLite
  const sqlite = new Database('database.sqlite')
  const db = drizzle(sqlite)

  // Quick table initialization for the demo
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: Bun.env.APP_NAME || name,
      APP_VERSION: Bun.env.APP_VERSION || version,
      VIEW_DIR: Bun.env.VIEW_DIR || 'src/views',
      // Database Config (SQLite)
      DB_CONNECTION: Bun.env.DB_CONNECTION || 'sqlite',
      DB_DATABASE: Bun.env.DB_DATABASE || 'database.sqlite',
      // Queue Config
      QUEUE_DRIVER: Bun.env.QUEUE_DRIVER || 'local',
      // Mail Config
      MAIL_MAILER: Bun.env.MAIL_MAILER || 'log',
    },
    // Add Orbits
    orbits: [
      new OrbitCache(),
      new OrbitView(),
      new OrbitInertia(),
      new OrbitDB({ db }), // Pass the Drizzle instance
      new OrbitQueue(),
      new OrbitMail(),
    ],
  })

  // 2. Boot
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // 3. Static files
  core.app.use('/static/*', serveStatic({ root: './' }))
  core.app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }))

  // 4. Hooks
  registerHooks(core)

  // 5. Routes
  registerRoutes(core)

  // 6. Liftoff!
  return core.liftoff()
}
