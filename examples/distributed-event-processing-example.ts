/**
 * 分佈式事件處理完整示例
 *
 * 本示例展示如何使用 Gravito Core 的 Bull Queue 整合
 * 實現高性能、可靠的分佈式事件處理系統。
 *
 * 運行方式：
 * bun run examples/distributed-event-processing-example.ts
 */

import {
  CommandKernel,
  DeadLetterQueue,
  EventPriorityQueue,
  HookManager,
  PlanetCore,
  QueueDashboard,
  registerQueueCommands,
} from '@gravito/core'

/**
 * 應用配置
 */
const config = {
  // 應用基本配置
  APP_NAME: 'Event Processing Service',
  PORT: 3000,

  // Redis 配置
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // 隊列配置
  QUEUE_NAME: 'gravito-events',
  QUEUE_CONCURRENCY: 4,
  QUEUE_ATTEMPTS: 3,
  QUEUE_BACKOFF_DELAY: 2000,

  // 日誌與監控
  ENABLE_QUEUE_LOGGING: process.env.ENABLE_QUEUE_LOGGING === 'true',
  ENABLE_QUEUE_METRICS: process.env.ENABLE_QUEUE_METRICS === 'true',
}

/**
 * 應用主類
 */
class EventProcessingService {
  private core!: PlanetCore
  private hookManager!: HookManager
  private eventQueue!: EventPriorityQueue
  private dlq!: DeadLetterQueue
  private dashboard!: QueueDashboard

  async bootstrap(): Promise<void> {
    console.log('🚀 啟動事件處理服務...')

    // 1. 初始化 Gravito Core
    this.core = await PlanetCore.boot({
      config: {
        APP_NAME: config.APP_NAME,
        PORT: config.PORT,
      },
      orbits: [], // 可添加業務模塊
    })

    // 2. 獲取核心服務
    this.hookManager = this.core.container.get(HookManager)
    this.eventQueue = this.core.container.get(EventPriorityQueue)
    this.dlq = this.core.container.get(DeadLetterQueue)

    // 3. 初始化 QueueDashboard
    this.dashboard = new QueueDashboard({
      eventQueue: this.eventQueue,
      hookManager: this.hookManager,
      dlq: this.dlq,
    })

    // 4. 註冊隊列 CLI 命令
    const commandKernel = this.core.container.get(CommandKernel)
    registerQueueCommands(commandKernel, this.dashboard)

    // 5. 註冊事件監聽器
    this.registerEventListeners()

    // 6. 啟動後臺監控
    this.startMonitoring()

    console.log('✅ 事件處理服務已啟動')
    console.log(`📊 Dashboard: http://localhost:${config.PORT}/queue-dashboard`)
  }

  /**
   * 註冊事件監聽器
   * 這些監聽器將被添加到隊列中並通過 Bull Queue 處理
   */
  private registerEventListeners(): void {
    // ============================================
    // 1. 用戶事件處理
    // ============================================

    this.hookManager.addAction('user.created', async (data: any) => {
      const { userId, email, name } = data

      console.log(`[user.created] Processing user: ${email}`)

      // 模擬業務邏輯
      await this.saveUserToDatabase({ userId, email, name })
      await this.sendWelcomeEmail(email, name)
      await this.initializeUserPreferences(userId)

      console.log(`[user.created] ✅ User ${email} created successfully`)
    })

    // 用戶刪除事件（延遲處理）
    this.hookManager.addAction('user.deleted', async (data: any) => {
      const { userId } = data

      console.log(`[user.deleted] Processing deletion of user: ${userId}`)

      // 清理用戶數據
      await this.deleteUserData(userId)
      await this.cancelUserSubscriptions(userId)
      await this.sendGoodbyeEmail(userId)

      console.log(`[user.deleted] ✅ User ${userId} deleted`)
    })

    // ============================================
    // 2. 訂單事件處理（優先級高）
    // ============================================

    this.hookManager.addAction('order.created', async (data: any) => {
      const { orderId, userId, items, totalPrice } = data

      console.log(`[order.created] Processing order: ${orderId}`)

      try {
        // 驗證庫存
        await this.validateInventory(items)

        // 建立訂單記錄
        await this.createOrder({ orderId, userId, items, totalPrice })

        // 發送訂單確認
        await this.sendOrderConfirmation(userId, orderId)

        // 觸發支付流程（異步，高優先級）
        await this.hookManager.dispatchQueued(
          'payment.requested',
          [{ orderId, userId, amount: totalPrice }],
          { priority: 'high' }
        )

        console.log(`[order.created] ✅ Order ${orderId} created`)
      } catch (error) {
        console.error(`[order.created] ❌ Error: ${error}`)
        throw error // 將被重試或發送到 DLQ
      }
    })

    // 訂單完成事件
    this.hookManager.addAction('order.completed', async (data: any) => {
      const { orderId, userId } = data

      console.log(`[order.completed] Processing completed order: ${orderId}`)

      // 更新訂單狀態
      await this.updateOrderStatus(orderId, 'completed')

      // 通知用戶
      await this.notifyOrderShipped(userId, orderId)

      // 異步任務：更新分析數據（低優先級）
      await this.hookManager.dispatchQueued(
        'analytics.order_completed',
        [{ orderId, userId, timestamp: Date.now() }],
        { priority: 'low' }
      )

      console.log(`[order.completed] ✅ Order ${orderId} completed`)
    })

    // ============================================
    // 3. 支付事件處理
    // ============================================

    this.hookManager.addAction('payment.requested', async (data: any) => {
      const { orderId, userId, amount } = data

      console.log(`[payment.requested] Processing payment: ${amount} for order ${orderId}`)

      try {
        // 調用支付網關
        const paymentId = await this.processPayment(orderId, amount)

        // 觸發支付成功事件
        await this.hookManager.dispatchQueued('payment.completed', [
          { orderId, userId, paymentId, amount },
        ])

        console.log(`[payment.requested] ✅ Payment processed: ${paymentId}`)
      } catch (error) {
        console.error(`[payment.requested] ❌ Payment failed: ${error}`)

        // 觸發支付失敗事件
        await this.hookManager.dispatchQueued('payment.failed', [
          { orderId, userId, error: String(error) },
        ])

        throw error
      }
    })

    // ============================================
    // 4. 分析和日誌事件（低優先級，異步）
    // ============================================

    this.hookManager.addAction('analytics.order_completed', async (data: any) => {
      const { orderId, userId, timestamp } = data

      console.log(`[analytics] Recording completed order: ${orderId}`)

      // 聚合數據到分析系統
      await this.recordAnalytics({
        event: 'order.completed',
        userId,
        orderId,
        timestamp,
      })
    })

    this.hookManager.addAction('audit.log', async (data: any) => {
      const { action, userId, resource, timestamp } = data

      console.log(`[audit] Logging action: ${action} on ${resource}`)

      // 記錄到審計日誌
      await this.writeAuditLog({
        action,
        userId,
        resource,
        timestamp,
      })
    })

    console.log('✅ 事件監聽器已註冊')
  }

  /**
   * 啟動後臺監控
   */
  private startMonitoring(): void {
    // 每 10 秒檢查一次隊列狀態
    setInterval(() => {
      const snapshot = this.dashboard.getSnapshot()

      const status = {
        timestamp: new Date().toISOString(),
        queueDepth: snapshot.queue.depth.total,
        backpressure: snapshot.queue.backpressure.state,
        workers: {
          active: snapshot.workers.activeWorkers,
          total: snapshot.workers.poolSize,
          utilization: `${(snapshot.workers.utilization * 100).toFixed(1)}%`,
          successRate: `${(snapshot.workers.successRate * 100).toFixed(2)}%`,
        },
        dlq: snapshot.errors.dlqCount,
      }

      console.log(`[Monitor] ${JSON.stringify(status)}`)

      // 告警：隊列深度過高
      if (snapshot.queue.depth.total > 1000) {
        console.warn('⚠️  WARNING: Queue depth exceeds 1000!')
      }

      // 告警：背壓狀態
      if (snapshot.queue.backpressure.state !== 'NORMAL') {
        console.warn(`⚠️  WARNING: Backpressure state is ${snapshot.queue.backpressure.state}`)
      }

      // 告警：DLQ 有失敗任務
      if (snapshot.errors.dlqCount > 10) {
        console.warn(`⚠️  WARNING: ${snapshot.errors.dlqCount} tasks in DLQ`)
      }
    }, 10000)
  }

  /**
   * 模擬業務方法
   */

  private async saveUserToDatabase(user: any): Promise<void> {
    // 模擬數據庫操作（100-300ms）
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 100))
    console.log(`  └─ 用戶已保存到數據庫: ${user.email}`)
  }

  private async sendWelcomeEmail(email: string, _name: string): Promise<void> {
    // 模擬郵件發送（200-500ms）
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 300 + 200))
    console.log(`  └─ 歡迎郵件已發送: ${email}`)
  }

  private async initializeUserPreferences(userId: string): Promise<void> {
    // 模擬初始化偏好設置
    await new Promise((resolve) => setTimeout(resolve, 50))
    console.log(`  └─ 用戶偏好已初始化: ${userId}`)
  }

  private async deleteUserData(userId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 用戶數據已刪除: ${userId}`)
  }

  private async cancelUserSubscriptions(userId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 用戶訂閱已取消: ${userId}`)
  }

  private async sendGoodbyeEmail(userId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 再見郵件已發送: ${userId}`)
  }

  private async validateInventory(_items: any[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  private async createOrder(order: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 訂單已建立: ${order.orderId}`)
  }

  private async sendOrderConfirmation(_userId: string, orderId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 訂單確認已發送: ${orderId}`)
  }

  private async updateOrderStatus(_orderId: string, status: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50))
    console.log(`  └─ 訂單狀態已更新: ${status}`)
  }

  private async notifyOrderShipped(_userId: string, orderId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`  └─ 發貨通知已發送: ${orderId}`)
  }

  private async processPayment(_orderId: string, _amount: number): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const paymentId = `PAY-${Date.now()}`
    console.log(`  └─ 支付已處理: ${paymentId}`)
    return paymentId
  }

  private async recordAnalytics(_data: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  private async writeAuditLog(_data: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 30))
  }

  /**
   * 示例：分發事件
   */
  async demonstrateEventDispatching(): Promise<void> {
    console.log('\n📨 示例：分發事件\n')

    // 1. 創建用戶（同步處理，進入隊列）
    console.log('→ 分發 user.created 事件...')
    await this.hookManager.dispatchQueued('user.created', [
      {
        userId: 'usr-123',
        email: 'john.doe@example.com',
        name: 'John Doe',
      },
    ])

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 2. 創建訂單（高優先級）
    console.log('\n→ 分發 order.created 事件（高優先級）...')
    await this.hookManager.dispatchQueued(
      'order.created',
      [
        {
          orderId: 'ord-456',
          userId: 'usr-123',
          items: ['item1', 'item2'],
          totalPrice: 99.99,
        },
      ],
      { priority: 'high' }
    )

    // 3. 記錄審計日誌（低優先級）
    console.log('\n→ 分發 audit.log 事件（低優先級）...')
    await this.hookManager.dispatchQueued(
      'audit.log',
      [
        {
          action: 'order.created',
          userId: 'usr-123',
          resource: 'ord-456',
          timestamp: Date.now(),
        },
      ],
      { priority: 'low' }
    )

    // 4. 延遲分發（5 秒後處理）
    console.log('\n→ 分發延遲事件（5 秒後）...')
    await this.hookManager.dispatchDeferredQueued(
      'order.completed',
      [{ orderId: 'ord-456', userId: 'usr-123' }],
      5000
    )

    console.log('\n⏳ 事件已分發到隊列，等待處理...\n')

    // 等待事件處理
    await new Promise((resolve) => setTimeout(resolve, 7000))

    // 5. 查詢隊列狀態
    const snapshot = this.dashboard.getSnapshot()
    console.log(`\n📊 隊列狀態快照：`)
    console.log(`   深度: ${snapshot.queue.depth.total}`)
    console.log(`   背壓: ${snapshot.queue.backpressure.state}`)
    console.log(`   成功率: ${(snapshot.workers.successRate * 100).toFixed(2)}%`)
    console.log(`   DLQ: ${snapshot.errors.dlqCount}`)
  }

  /**
   * 優雅關閉
   */
  async shutdown(): Promise<void> {
    console.log('\n🛑 正在關閉服務...')

    // 停止接收新事件
    // await this.hookManager.pause()

    // 等待現有任務完成
    // await this.core.container.get(WorkerPool).stop()

    console.log('✅ 服務已關閉')
  }
}

/**
 * 主程序
 */
async function main() {
  const service = new EventProcessingService()

  try {
    // 1. 啟動服務
    await service.bootstrap()

    // 2. 演示事件分發
    await service.demonstrateEventDispatching()

    // 3. 輸出監控指令
    console.log(`
🎯 監控隊列狀態：
   $ gravito queue status
   $ gravito queue monitor --interval 5s
   $ gravito queue export --format prometheus

🔧 故障排除：
   $ gravito queue pending --limit 20
   $ gravito queue failed --limit 20
   $ gravito queue job <job-id>

📊 查看儀表板：
   http://localhost:3000/queue-dashboard
    `)

    // 保持應用運行
    process.on('SIGINT', async () => {
      await service.shutdown()
      process.exit(0)
    })
  } catch (error) {
    console.error('❌ 啟動失敗:', error)
    process.exit(1)
  }
}

// 運行應用
main()
