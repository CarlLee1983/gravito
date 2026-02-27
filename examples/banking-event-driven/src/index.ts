#!/usr/bin/env bun

import { PlanetCore } from '@gravito/core'
import { cors } from '@gravito/photon/middleware/cors'
import gravitoConfig from './gravito.config'
import type { DeadLetterListener } from './infrastructure/listeners/DeadLetterListener'
import type { AccountController } from './presentation/http/controllers/AccountController'
import type { TransferController } from './presentation/http/controllers/TransferController'
import { registerRoutes } from './presentation/http/routes'
import type { SSEManager } from './presentation/http/SSEManager'
import { BankingServiceProvider } from './providers/BankingServiceProvider'
import { EventServiceProvider } from './providers/EventServiceProvider'

/**
 * Bootstraps the Banking Event-Driven application.
 * Initializes the core framework, registers service providers, configures middleware,
 * and starts the HTTP server.
 */
async function bootstrap(): Promise<void> {
  try {
    // =========================================================================
    // 1. Initialize PlanetCore
    // =========================================================================
    const core = new PlanetCore({ config: gravitoConfig as Record<string, unknown> })

    // =========================================================================
    // 2. Register Service Providers
    // =========================================================================
    core.register(new BankingServiceProvider())
    core.register(new EventServiceProvider())

    // =========================================================================
    // 3. Add CORS Middleware (Support cross-origin requests)
    // =========================================================================
    // SECURITY: Restrict CORS to known origins only
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      'http://localhost:8080', // Common dev port
      // In production, add your actual domain(s) here
      // e.g., 'https://banking.example.com'
    ]

    core.adapter.use(
      '*',
      cors({
        origin: (requestOrigin: string | undefined) => {
          if (!requestOrigin) {
            return 'http://localhost:3000' // Default for non-browser requests
          }
          return allowedOrigins.includes(requestOrigin) ? requestOrigin : false
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true, // Allow cookies/auth headers
      })
    )

    // =========================================================================
    // 4. Bootstrap (Initialize all providers)
    // =========================================================================
    await core.bootstrap()

    // =========================================================================
    // 5. Register HTTP Routes
    // =========================================================================
    const accountController = core.container.make<AccountController>('AccountController')
    const transferController = core.container.make<TransferController>('TransferController')
    const sseManager = core.container.make<SSEManager>('SSEManager')
    const deadLetterListener = core.container.make<DeadLetterListener>('DeadLetterListener')

    registerRoutes(
      core.router,
      accountController,
      transferController,
      sseManager,
      deadLetterListener
    )

    // =========================================================================
    // 6. Start HTTP Server
    // =========================================================================
    const { fetch } = core.liftoff()
    const finalPort = gravitoConfig.http.port

    Bun.serve({
      port: finalPort,
      fetch,
      error: (error: Error) => {
        console.error('Server error:', error)
        return new Response('Internal Server Error', { status: 500 })
      },
    })

    const baseUrl = `http://localhost:${finalPort}`

    console.log('\n=== Banking Event-Driven API Started ===')
    console.log(`Address: ${baseUrl}`)
    console.log('\n=== API Endpoints ===')
    console.log('POST   /api/accounts              - Open Account')
    console.log('GET    /api/accounts              - List All Accounts')
    console.log('GET    /api/accounts/:id          - Account Details')
    console.log('GET    /api/accounts/:id/balance  - Check Balance')
    console.log('POST   /api/accounts/:id/deposit  - Deposit Funds')
    console.log('POST   /api/accounts/:id/withdraw - Withdraw Funds')
    console.log('POST   /api/accounts/:id/freeze   - Freeze Account')
    console.log('POST   /api/accounts/:id/unfreeze - Unfreeze Account')
    console.log('POST   /api/transfers             - Initiate Transfer')
    console.log('GET    /api/transfers/:id         - Track Transfer Status')
    console.log('GET    /api/accounts/:id/transactions - Transaction History')
    console.log('GET    /api/events/stream         - SSE Event Stream')
    console.log('GET    /api/dlq                   - Dead Letter Queue')
    console.log('GET    /api/health                - Health Check')
    console.log('=====================================\n')

    // =========================================================================
    // 7. Graceful Shutdown
    // =========================================================================
    const handleShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down...`)
      process.exit(0)
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))
  } catch (error) {
    console.error('Application failed to start:', error)
    process.exit(1)
  }
}

bootstrap().catch(console.error)
