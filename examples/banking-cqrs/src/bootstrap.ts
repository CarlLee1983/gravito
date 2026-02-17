import type { PlanetCore } from '@gravito/core'
import { migrate } from '../database/migrations/index'
import { CqrsProvider } from './Providers/CqrsProvider'
import { registerRoutes } from './routes'

/**
 * Bootstrap Database and Application Setup
 *
 * This module handles all initialization required before the application
 * starts accepting requests. It's the entry point for application setup.
 *
 * **Execution Order:**
 * 1. Register CqrsProvider (dependency injection setup)
 * 2. Run database migrations (create tables)
 * 3. Register HTTP routes (endpoint setup)
 *
 * **Called From:** index.ts during application startup
 *
 * **Dependencies:**
 * - PlanetCore: Framework's main orchestrator
 * - CqrsProvider: Registers all command/query handlers
 * - Database migrations: Creates schema
 * - Route registration: Maps HTTP endpoints
 *
 * @example
 * ```typescript
 * // In index.ts
 * const core = new PlanetCore(defineConfig(...))
 * await bootstrapDatabase(core)
 * export default core.liftoff(port)
 * ```
 */

/**
 * Initializes database and application infrastructure
 *
 * This function must be called once during application startup, before
 * the server begins accepting requests. It performs three critical steps:
 *
 * **1. CQRS Provider Registration**
 * Registers all command/query handlers with the Container:
 * - All CommandHandler implementations
 * - All QueryHandler implementations
 * - Repository implementations
 * - CommandBus and QueryBus instances
 *
 * **2. Database Migrations**
 * Creates necessary database tables if they don't exist:
 * - accounts table with schema
 * - transactions table with indexes
 * - Foreign key relationships
 * Uses idempotent CREATE TABLE IF NOT EXISTS to allow safe reruns.
 *
 * **3. Route Registration**
 * Registers all 7 HTTP endpoints:
 * - Account creation, retrieval
 * - Balance queries
 * - Transaction operations (deposit, withdraw, transfer)
 * - Transaction history with pagination
 *
 * **Idempotent Operations:**
 * Safe to call multiple times - migrations check existence before creating.
 *
 * **Error Handling:**
 * Any error (provider registration, migration, routing) throws and prevents startup.
 * This is intentional - application should not start with misconfiguration.
 *
 * @param core - PlanetCore instance (provides container, router, hooks)
 * @throws If provider registration, migration, or routing setup fails
 *
 * @example
 * ```typescript
 * const core = new PlanetCore(defineConfig({
 *   adapter: new PhotonAdapter()
 * }))
 *
 * try {
 *   await bootstrapDatabase(core)
 *   // Ready to start server
 * } catch (error) {
 *   console.error('Bootstrap failed:', error)
 *   process.exit(1)
 * }
 * ```
 *
 * @see {@link CqrsProvider} - Dependency injection container setup
 * @see {@link migrate} - Database schema creation
 * @see {@link registerRoutes} - HTTP route definitions
 */
export async function bootstrapDatabase(core: PlanetCore): Promise<void> {
  // Register CQRS provider (dependency injection)
  core.register(new CqrsProvider())

  // Execute database migrations (create tables)
  await migrate()

  // Register HTTP routes (endpoint handlers)
  const router = core.container.make('router')
  registerRoutes(router)
}
