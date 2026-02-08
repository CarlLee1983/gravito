/**
 * 分佈式事件重試系統完整範例
 *
 * 展示如何使用 RetryScheduler + EventPriorityQueue + BackpressureManager
 * 構建高可靠的分佈式事件處理系統
 */

import {
  BackpressureManager,
  DeadLetterQueue,
  EventPriorityQueue,
  OTelEventMetrics,
  RetryScheduler,
} from '../src/index'

// ============================================================================
// 1. 事件定義
// ============================================================================

interface OrderEvent {
  id: string
  orderId: string
  customerId: string
  amount: number
  timestamp: Date
  retryCount?: number
  lastError?: string
}

interface PaymentEvent {
  id: string
  orderId: string
  amount: number
  paymentMethod: string
  timestamp: Date
}

// ============================================================================
// 2. 事件監聽器與處理器
// ============================================================================

class OrderEventHandler {
  private failureRate = 0.2 // 20% 失敗率（模擬）
  private processing = 0
  private succeeded = 0
  private failed = 0

  async handle(event: OrderEvent): Promise<void> {
    this.processing++

    try {
      // 模擬外部 API 調用
      if (Math.random() < this.failureRate) {
        throw new Error(`訂單服務暫時不可用 (orderId: ${event.orderId})`)
      }

      // 模擬業務邏輯
      await this.processOrder(event)
      this.succeeded++

      console.log(`✅ 訂單處理成功 #${event.orderId}`)
    } catch (error) {
      this.failed++
      throw error
    } finally {
      this.processing--
    }
  }

  private async processOrder(event: OrderEvent): Promise<void> {
    // 模擬數據庫操作
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 業務邏輯
    console.log(`[Order Handler] 處理訂單 ${event.orderId}，金額 ¥${event.amount}`)
  }

  getStats() {
    return {
      processing: this.processing,
      succeeded: this.succeeded,
      failed: this.failed,
      successRate: this.succeeded / (this.succeeded + this.failed) || 0,
    }
  }
}

class PaymentEventHandler {
  private processing = 0
  private succeeded = 0

  async handle(event: PaymentEvent): Promise<void> {
    this.processing++

    try {
      // 模擬支付閘道呼叫
      console.log(`[Payment Handler] 處理支付，訂單 ${event.orderId}，金額 ¥${event.amount}`)
      await new Promise((resolve) => setTimeout(resolve, 200))
      this.succeeded++
    } finally {
      this.processing--
    }
  }

  getStats() {
    return {
      processing: this.processing,
      succeeded: this.succeeded,
    }
  }
}

// ============================================================================
// 3. 監控與指標收集
// ============================================================================

class SystemMonitor {
  private startTime = Date.now()
  private metrics = {
    eventsEnqueued: 0,
    eventsProcessed: 0,
    eventsFailed: 0,
    eventsRetried: 0,
    dlqSize: 0,
    avgLatency: 0,
  }

  recordEnqueue() {
    this.metrics.eventsEnqueued++
  }

  recordProcessed() {
    this.metrics.eventsProcessed++
  }

  recordFailed() {
    this.metrics.eventsFailed++
  }

  recordRetried() {
    this.metrics.eventsRetried++
  }

  recordDLQEntry() {
    this.metrics.dlqSize++
  }

  setAvgLatency(latency: number) {
    this.metrics.avgLatency = latency
  }

  printStats() {
    const uptime = (Date.now() - this.startTime) / 1000
    console.log(`\n${'='.repeat(80)}`)
    console.log('📊 系統統計信息')
    console.log('='.repeat(80))
    console.log(`⏱️  運行時間：${uptime.toFixed(2)} 秒`)
    console.log(`📤 已入隊事件：${this.metrics.eventsEnqueued}`)
    console.log(`✅ 已處理事件：${this.metrics.eventsProcessed}`)
    console.log(`❌ 失敗事件：${this.metrics.eventsFailed}`)
    console.log(`🔄 已重試事件：${this.metrics.eventsRetried}`)
    console.log(`💀 DLQ 事件：${this.metrics.dlqSize}`)
    console.log(`⏱️  平均延遲：${this.metrics.avgLatency.toFixed(2)}ms`)
    console.log(`${'='.repeat(80)}\n`)
  }
}

// ============================================================================
// 4. 系統初始化與配置
// ============================================================================

async function setupSystem() {
  console.log('🚀 初始化分佈式事件重試系統...\n')

  // 4.1 初始化核心組件
  const queue = new EventPriorityQueue()
  const backpressure = new BackpressureManager({
    warningThreshold: 500,
    criticalThreshold: 1000,
    recoveryRatio: 0.8,
    overflowRetryStrategy: 'dlq-with-retry',
    overflowRetryDelayMs: 5000,
    dlqOnOverflow: true,
  })
  const scheduler = new RetryScheduler({
    initialDelayMs: 1000,
    multiplier: 2,
    maxDelayMs: 60000,
    maxRetries: 5,
    backoffStrategy: 'exponential',
  })
  const dlq = new DeadLetterQueue(500)
  const monitor = new SystemMonitor()
  const handlers = {
    order: new OrderEventHandler(),
    payment: new PaymentEventHandler(),
  }

  // 4.2 配置隊列
  queue.setBackpressureManager(backpressure)
  queue.setRetryScheduler(scheduler)

  // 4.3 配置 OTel 指標（可選）
  const metrics = new OTelEventMetrics()

  console.log('✅ 系統初始化完成\n')

  return {
    queue,
    backpressure,
    scheduler,
    dlq,
    monitor,
    handlers,
    metrics,
  }
}

// ============================================================================
// 5. 事件處理管道
// ============================================================================

async function setupEventHandlers(system: Awaited<ReturnType<typeof setupSystem>>) {
  const { queue, scheduler, dlq, monitor, handlers, backpressure } = system

  // 5.1 隊列事件監聽
  queue.on('enqueued', (_event) => {
    monitor.recordEnqueue()
  })

  queue.on('dequeued', async (event: OrderEvent | PaymentEvent) => {
    const startTime = Date.now()

    try {
      // 根據事件類型路由到不同的處理器
      if ('orderId' in event && 'customerId' in event) {
        await handlers.order.handle(event as OrderEvent)
      } else if ('paymentMethod' in event) {
        await handlers.payment.handle(event as PaymentEvent)
      }

      monitor.recordProcessed()
      monitor.setAvgLatency(Date.now() - startTime)
    } catch (error) {
      monitor.recordFailed()
      throw error
    }
  })

  // 5.2 背壓事件監聽
  backpressure.on('state-change', (state, reason) => {
    console.log(`⚠️  背壓狀態變更：${state}（${reason}）`)
  })

  backpressure.on('overflow', (decision) => {
    console.log(`🚨 系統過載，決策：${decision.action}`)
    if (decision.retryStrategy) {
      console.log(`   重試策略：${decision.retryStrategy}`)
    }
  })

  // 5.3 重試排程器事件監聽
  scheduler.on('retry', (eventName, retryCount, delay) => {
    monitor.recordRetried()
    console.log(`🔄 排程重試：${eventName}，第 ${retryCount} 次，延遲 ${delay}ms`)
  })

  scheduler.on('exhausted', (eventName, reason) => {
    console.log(`💀 重試已耗盡：${eventName}（${reason}）`)
    dlq.add({
      id: Date.now().toString(),
      event: null,
      timestamp: new Date(),
      reason,
      source: 'retry_exhausted',
      metadata: {},
    })
    monitor.recordDLQEntry()
  })

  scheduler.on('error', (error) => {
    console.error(`❌ 排程器錯誤：${error.message}`)
  })

  // 5.4 DLQ 事件監聽
  dlq.on('entry-added', (entry) => {
    console.log(`📥 DLQ 新增條目：${entry.source}`)
  })

  console.log('✅ 事件監聽器配置完成\n')
}

// ============================================================================
// 6. 測試場景生成
// ============================================================================

function generateTestEvents(count = 100) {
  const events: (OrderEvent | PaymentEvent)[] = []

  for (let i = 0; i < count; i++) {
    const orderId = `ORD-${String(i + 1).padStart(5, '0')}`

    if (i % 2 === 0) {
      // 訂單事件
      events.push({
        id: `evt-${i}`,
        orderId,
        customerId: `CUST-${i % 10}`,
        amount: 100 + Math.random() * 1000,
        timestamp: new Date(),
        retryCount: 0,
      })
    } else {
      // 支付事件
      events.push({
        id: `evt-${i}`,
        orderId,
        amount: 100 + Math.random() * 1000,
        paymentMethod: ['credit_card', 'bank_transfer', 'wallet'][i % 3],
        timestamp: new Date(),
      })
    }
  }

  return events
}

// ============================================================================
// 7. 負載測試
// ============================================================================

async function runLoadTest(system: Awaited<ReturnType<typeof setupSystem>>) {
  const { queue, scheduler } = system

  console.log('📊 開始負載測試...\n')

  // 7.1 生成測試事件
  const events = generateTestEvents(200)

  // 7.2 分階段派發事件
  const phases = [
    { name: '預熱', events: events.slice(0, 50), delayMs: 50 },
    { name: '正常負載', events: events.slice(50, 150), delayMs: 10 },
    { name: '高負載', events: events.slice(150, 200), delayMs: 5 },
  ]

  for (const phase of phases) {
    console.log(`\n📈 ${phase.name}階段（${phase.events.length} 個事件）`)

    for (const event of phase.events) {
      // 根據事件類型決定優先級
      const priority = Math.random() < 0.3 ? 'high' : 'normal'
      queue.enqueue(event, priority)
      await new Promise((resolve) => setTimeout(resolve, phase.delayMs))
    }

    console.log(`✅ ${phase.name}階段完成`)
  }

  // 7.3 等待所有事件處理完成
  console.log('\n⏳ 等待所有事件處理完成...')

  let waitCount = 0
  while (waitCount < 120) {
    // 最多等待 2 分鐘
    const metrics = scheduler.getMetrics()
    if (metrics.pendingRetries === 0) {
      console.log('✅ 所有事件已處理或進入 DLQ')
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
    waitCount++

    if (waitCount % 10 === 0) {
      console.log(`   待重試：${metrics.pendingRetries}，已排程：${metrics.totalScheduled}`)
    }
  }

  console.log('✅ 負載測試完成')
}

// ============================================================================
// 8. 監控與報告
// ============================================================================

function printDetailedReport(system: Awaited<ReturnType<typeof setupSystem>>) {
  const { scheduler, dlq, handlers, monitor } = system

  console.log(`\n${'='.repeat(80)}`)
  console.log('📈 詳細系統報告')
  console.log('='.repeat(80))

  // 排程器指標
  const schedulerMetrics = scheduler.getMetrics()
  console.log('\n🔄 重試排程器')
  console.log(`   活躍隊列數：${schedulerMetrics.activeQueues}`)
  console.log(`   待重試任務：${schedulerMetrics.pendingRetries}`)
  console.log(`   已排程總數：${schedulerMetrics.totalScheduled}`)
  console.log(`   失敗總數：${schedulerMetrics.totalFailed}`)
  console.log(`   平均延遲：${schedulerMetrics.averageDelay.toFixed(0)}ms`)

  // DLQ 統計
  const dlqSize = dlq.size()
  console.log(`\n💀 死信隊列`)
  console.log(`   隊列大小：${dlqSize}`)
  console.log(`   最大容量：${dlq.maxSize || 'unlimited'}`)

  // 處理器統計
  const orderStats = handlers.order.getStats()
  const paymentStats = handlers.payment.getStats()

  console.log(`\n📦 訂單處理器`)
  console.log(`   成功：${orderStats.succeeded}`)
  console.log(`   失敗：${orderStats.failed}`)
  console.log(`   進行中：${orderStats.processing}`)
  console.log(`   成功率：${(orderStats.successRate * 100).toFixed(2)}%`)

  console.log(`\n💳 支付處理器`)
  console.log(`   成功：${paymentStats.succeeded}`)
  console.log(`   進行中：${paymentStats.processing}`)

  // 系統總體統計
  monitor.printStats()

  console.log(`${'='.repeat(80)}\n`)
}

// ============================================================================
// 9. 優雅關閉
// ============================================================================

async function gracefulShutdown(system: Awaited<ReturnType<typeof setupSystem>>) {
  const { scheduler, queue } = system

  console.log('\n🛑 開始優雅關閉...')

  // 步驟 1: 停止接受新事件
  console.log('   步驟 1: 停止接受新事件')
  queue.pause()

  // 步驟 2: 等待進行中的事件完成
  console.log('   步驟 2: 等待進行中的事件完成')
  let attempts = 0
  while (attempts < 60) {
    const metrics = scheduler.getMetrics()
    if (metrics.pendingRetries === 0) {
      console.log('   ✅ 所有待重試事件已完成')
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
    attempts++
  }

  // 步驟 3: 關閉排程器
  console.log('   步驟 3: 關閉排程器')
  await scheduler.shutdown()

  console.log('✅ 優雅關閉完成\n')
}

// ============================================================================
// 10. 主程序
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║        分佈式事件重試系統完整範例                                              ║')
  console.log('║        Distributed Event Retry System with Bull Queue + Prometheus            ║')
  console.log(
    '╚════════════════════════════════════════════════════════════════════════════════╝\n'
  )

  let system: Awaited<ReturnType<typeof setupSystem>> | null = null

  try {
    // 1. 初始化系統
    system = await setupSystem()

    // 2. 配置事件監聽器
    await setupEventHandlers(system)

    // 3. 運行負載測試
    await runLoadTest(system)

    // 4. 打印詳細報告
    printDetailedReport(system)

    // 5. 優雅關閉
    if (system) {
      await gracefulShutdown(system)
    }

    console.log('✅ 範例執行完成\n')
    process.exit(0)
  } catch (error) {
    console.error('❌ 執行錯誤：', error)

    if (system) {
      try {
        await gracefulShutdown(system)
      } catch (shutdownError) {
        console.error('❌ 關閉錯誤：', shutdownError)
      }
    }

    process.exit(1)
  }
}

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, _promise) => {
  console.error('未捕獲的 Promise 拒絕：', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常：', error)
  process.exit(1)
})

// 執行主程序
main()
