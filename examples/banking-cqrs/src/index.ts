import { defineConfig, PhotonAdapter, PlanetCore } from '@gravito/core'
import { bootstrapDatabase } from './bootstrap'

/**
 * Banking CQRS Application Entry Point
 *
 * This is the main application file that initializes and starts the Gravito
 * banking application using the CQRS architectural pattern.
 *
 * **Initialization Steps:**
 * 1. Create PlanetCore with PhotonAdapter (HTTP engine)
 * 2. Run async bootstrap for DI, migrations, routes
 * 3. Start HTTP server on specified port
 * 4. Export server instance for hosting
 *
 * **Architecture:**
 * - **PlanetCore:** Framework's microkernel with hooks and DI container
 * - **PhotonAdapter:** HTTP server built on Hono framework
 * - **CQRS Pattern:** Separate command (write) and query (read) handlers
 *
 * **Configuration:**
 * - Adapter: PhotonAdapter (Hono-based HTTP engine)
 * - Port: From PORT env var (default: 3000)
 * - Database: Configured in CqrsProvider (SQLite for dev, PostgreSQL for prod)
 *
 * **Execution Flow:**
 * 1. Import and create core with Photon adapter
 * 2. Resolve port from environment
 * 3. Async bootstrap (provider registration, migrations, routes)
 * 4. Start server via core.liftoff(port)
 * 5. Log startup message to console
 * 6. Export server for hosting framework
 *
 * **Environment Variables:**
 * - PORT: HTTP server port (default: 3000)
 * - GRAVITO_ENV: Environment name (development/production)
 * - DATABASE_URL: Database connection string (set by CqrsProvider)
 *
 * **Example:**
 * ```bash
 * PORT=3080 bun run dev
 * # Output: 🏦 CQRS 銀行應用已啟動: http://localhost:3080
 * ```
 *
 * **Testing:**
 * ```bash
 * curl -X POST http://localhost:3000/api/accounts \\
 *   -H 'Content-Type: application/json' \\
 *   -d '{"ownerName": "John Doe", "currency": "TWD"}'
 * ```
 *
 * @since 1.0.0
 */

/**
 * Create PlanetCore with Photon HTTP adapter
 *
 * PlanetCore is the framework's microkernel that provides:
 * - Dependency injection container
 * - Hook system for cross-module communication
 * - Lifecycle management
 * - Service provider registration
 *
 * PhotonAdapter provides HTTP server capabilities via Hono framework.
 */
const core = new PlanetCore(
  defineConfig({
    adapter: new PhotonAdapter(),
  })
)

/**
 * Resolve port from environment (default: 3000)
 * Allows deployment flexibility via PORT env var
 */
const port = parseInt(process.env.PORT || '3000', 10)

/**
 * Async bootstrap sequence
 *
 * Initializes all application infrastructure before server accepts requests.
 * This includes:
 * - Registering CQRS providers (dependency injection setup)
 * - Running database migrations (schema creation)
 * - Registering HTTP routes (endpoint setup)
 */
;(async () => {
  await bootstrapDatabase(core)
  console.log(`🏦 CQRS 銀行應用已啟動: http://localhost:${port}`)
})()

/**
 * Start HTTP server and export instance
 *
 * core.liftoff(port) starts the server and returns the server instance
 * for use by Bun/Node.js hosting framework. This is the main export that
 * gets executed when this file is the entry point.
 */
export default core.liftoff(port)
