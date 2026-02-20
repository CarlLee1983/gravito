import type { Router } from '@gravito/core'
import type { DeadLetterListener } from '../../infrastructure/listeners/DeadLetterListener'
import type { AccountController } from './controllers/AccountController'
import type { TransferController } from './controllers/TransferController'
import type { SSEManager } from './SSEManager'

/**
 * Registers all HTTP routes for the Banking Event-Driven application.
 *
 * @param router - The core router instance.
 * @param accountController - Controller for account operations.
 * @param transferController - Controller for fund transfers.
 * @param sseManager - Manager for real-time event streaming.
 * @param deadLetterListener - Listener for failed operations (DLQ).
 */
export function registerRoutes(
  router: Router,
  accountController: AccountController,
  transferController: TransferController,
  sseManager: SSEManager,
  deadLetterListener: DeadLetterListener
): void {
  // ============================================================================
  // Health Check
  // ============================================================================
  router.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'banking-event-driven',
    })
  })

  // ============================================================================
  // Account Routes
  // ============================================================================
  router.post('/api/accounts', (c) => accountController.openAccount(c))
  router.get('/api/accounts', (c) => accountController.getAllAccounts(c))
  router.get('/api/accounts/:id', (c) => accountController.getAccount(c))
  router.get('/api/accounts/:id/balance', (c) => accountController.getBalance(c))
  router.post('/api/accounts/:id/deposit', (c) => accountController.depositMoney(c))
  router.post('/api/accounts/:id/withdraw', (c) => accountController.withdrawMoney(c))
  router.post('/api/accounts/:id/freeze', (c) => accountController.freezeAccount(c))
  router.post('/api/accounts/:id/unfreeze', (c) => accountController.unfreezeAccount(c))

  // ============================================================================
  // Transfer Routes
  // ============================================================================
  router.post('/api/transfers', (c) => transferController.initiateTransfer(c))
  router.get('/api/transfers/:id', (c) => transferController.getTransferStatus(c))
  router.get('/api/accounts/:id/transactions', (c) => transferController.getTransactionHistory(c))

  // ============================================================================
  // SSE (Server-Sent Events) Stream
  // ============================================================================
  router.get('/api/events/stream', (c) => {
    let controller: ReadableStreamDefaultController<Uint8Array> | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        controller = ctrl
        sseManager.registerClient(controller)

        // Send connection success message
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'))

        // Set up heartbeat to prevent connection timeout (every 30 seconds)
        heartbeatInterval = setInterval(() => {
          if (controller) {
            try {
              const encoder = new TextEncoder()
              controller.enqueue(encoder.encode(':ping\n\n'))
            } catch {
              // Client disconnected, cleanup will occur in cancel handler
            }
          }
        }, 30000)
      },
      cancel() {
        // Clean up heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }

        // Unregister client from SSE manager
        if (controller) {
          sseManager.unregisterClient(controller)
          controller = null
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        // CORS headers are handled by the CORS middleware in index.ts
      },
    })
  })

  // ============================================================================
  // Dead Letter Queue (Protected - Admin Only)
  // ============================================================================
  router.get('/api/dlq', (c) => {
    // SECURITY: Require authorization to access DLQ
    const authHeader = c.req.header('Authorization')

    // Simple API key authentication for demo purposes
    // In production, use OAuth2, JWT, or similar
    const expectedApiKey = process.env.DLQ_API_KEY || 'demo-api-key-change-in-production'
    const providedKey = authHeader?.replace(/^Bearer\s+/i, '')

    if (!providedKey || providedKey !== expectedApiKey) {
      return c.json({ success: false, error: 'Unauthorized access to DLQ' }, 401)
    }

    const records = deadLetterListener.getDLQRecords()
    return c.json({ success: true, data: records, total: records.length })
  })

  // ============================================================================
  // Frontend static file serving (serving public/index.html)
  // ============================================================================
  router.get('/', async () => {
    const file = Bun.file(new URL('../../../../public/index.html', import.meta.url).pathname)
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    return new Response('Banking Event-Driven API is running. UI not found.', {
      headers: { 'Content-Type': 'text/plain' },
    })
  })
}
