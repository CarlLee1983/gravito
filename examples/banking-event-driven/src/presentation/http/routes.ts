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
    const stream = new ReadableStream({
      start(controller) {
        sseManager.registerClient(controller)

        // Send connection success message
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'))
      },
      cancel(controller) {
        sseManager.unregisterClient(controller as any)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  })

  // ============================================================================
  // Dead Letter Queue
  // ============================================================================
  router.get('/api/dlq', (c) => {
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
