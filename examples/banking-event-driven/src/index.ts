#!/usr/bin/env bun

import { PlanetCore } from '@gravito/core'
import gravitoConfig from './gravito.config'
import type { DeadLetterListener } from './infrastructure/listeners/DeadLetterListener'
import type { AccountController } from './presentation/http/controllers/AccountController'
import type { TransferController } from './presentation/http/controllers/TransferController'
import { registerRoutes } from './presentation/http/routes'
import type { SSEManager } from './presentation/http/SSEManager'
import { BankingServiceProvider } from './providers/BankingServiceProvider'
import { EventServiceProvider } from './providers/EventServiceProvider'

async function bootstrap(): Promise<void> {
  try {
    // =========================================================================
    // 1. 初始化 PlanetCore
    // =========================================================================
    const core = new PlanetCore({ config: gravitoConfig as Record<string, unknown> })

    // =========================================================================
    // 2. 註冊所有 ServiceProvider
    // =========================================================================
    core.register(new BankingServiceProvider())
    core.register(new EventServiceProvider())

    // =========================================================================
    // 3. Bootstrap（初始化所有 Providers）
    // =========================================================================
    await core.bootstrap()

    // =========================================================================
    // 4. 註冊 HTTP 路由
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
    // 5. 啟動 HTTP 伺服器
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

    console.log('\n=== Banking Event-Driven API 已啟動 ===')
    console.log(`地址: ${baseUrl}`)
    console.log('\n=== API 端點 ===')
    console.log('POST   /api/accounts              - 開立帳戶')
    console.log('GET    /api/accounts              - 查詢所有帳戶')
    console.log('GET    /api/accounts/:id          - 查詢帳戶詳情')
    console.log('GET    /api/accounts/:id/balance  - 查詢餘額')
    console.log('POST   /api/accounts/:id/deposit  - 存款')
    console.log('POST   /api/accounts/:id/withdraw - 提款')
    console.log('POST   /api/accounts/:id/freeze   - 凍結帳戶')
    console.log('POST   /api/accounts/:id/unfreeze - 解凍帳戶')
    console.log('POST   /api/transfers             - 發起轉帳')
    console.log('GET    /api/transfers/:id         - 查詢轉帳狀態')
    console.log('GET    /api/accounts/:id/transactions - 查詢交易歷史')
    console.log('GET    /api/events/stream         - SSE 事件串流')
    console.log('GET    /api/dlq                   - 死信佇列')
    console.log('GET    /api/health                - 健康檢查')
    console.log('=====================================\n')

    // =========================================================================
    // 6. 優雅關閉
    // =========================================================================
    const handleShutdown = (signal: string) => {
      console.log(`\n收到 ${signal} 信號，開始關閉...`)
      process.exit(0)
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))
  } catch (error) {
    console.error('應用啟動失敗:', error)
    process.exit(1)
  }
}

bootstrap().catch(console.error)
