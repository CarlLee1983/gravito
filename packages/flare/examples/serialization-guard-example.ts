/**
 * 序列化守衛範例
 *
 * 展示如何使用 checkSerializable 和 assertSerializable 來確保通知可以安全序列化
 */

import { Notification } from '../src/Notification'
import type { MailMessage, Notifiable } from '../src/types'
import { assertSerializable, checkSerializable } from '../src/utils/serializationGuard'

/**
 * 範例 1: 可序列化的通知
 */
class GoodNotification extends Notification {
  constructor(
    public orderId: string,
    public amount: number,
    public createdAt: Date
  ) {
    super()
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    return {
      subject: `訂單 ${this.orderId} 已確認`,
      text: `金額: ${this.amount}, 日期: ${this.createdAt.toISOString()}`,
    }
  }
}

/**
 * 範例 2: 不可序列化的通知（包含函式）
 */
class BadNotification extends Notification {
  constructor(
    public orderId: string,
    public callback: () => void // ❌ 函式無法序列化
  ) {
    super()
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    return {
      subject: '通知',
      text: 'Test',
    }
  }
}

/**
 * 範例 3: 包含循環引用的通知
 */
class CircularNotification extends Notification {
  public self: any

  constructor(public orderId: string) {
    super()
    this.self = this // ❌ 循環引用
  }

  via(_notifiable: Notifiable): string[] {
    return ['mail']
  }

  toMail(_notifiable: Notifiable): MailMessage {
    return {
      subject: '通知',
      text: 'Test',
    }
  }
}

/**
 * 使用 checkSerializable 檢查通知
 */
function example1_checkSerializable() {
  console.log('=== 範例 1: checkSerializable ===\n')

  // 測試可序列化的通知
  const goodNotification = new GoodNotification('ORD-123', 1500, new Date())
  const goodResult = checkSerializable(goodNotification)

  console.log('✅ 好的通知:')
  console.log('  可序列化:', goodResult.serializable)
  console.log('  問題路徑:', goodResult.problematicPaths)
  console.log()

  // 測試不可序列化的通知
  const badNotification = new BadNotification('ORD-456', () => {
    console.log('callback')
  })
  const badResult = checkSerializable(badNotification)

  console.log('❌ 壞的通知:')
  console.log('  可序列化:', badResult.serializable)
  console.log('  問題路徑:', badResult.problematicPaths)
  console.log('  警告訊息:')
  for (const warning of badResult.warnings) {
    console.log(`    - ${warning}`)
  }
  console.log()

  // 測試循環引用
  const circularNotification = new CircularNotification('ORD-789')
  const circularResult = checkSerializable(circularNotification)

  console.log('🔄 循環引用通知:')
  console.log('  可序列化:', circularResult.serializable)
  console.log('  問題路徑:', circularResult.problematicPaths)
  console.log('  警告訊息:')
  for (const warning of circularResult.warnings) {
    console.log(`    - ${warning}`)
  }
  console.log()
}

/**
 * 使用 assertSerializable 斷言通知可序列化
 */
function example2_assertSerializable() {
  console.log('=== 範例 2: assertSerializable ===\n')

  // 測試可序列化的通知
  const goodNotification = new GoodNotification('ORD-123', 1500, new Date())

  try {
    assertSerializable(goodNotification)
    console.log('✅ 通知可序列化，通過檢查')
  } catch (error) {
    console.error('❌ 通知不可序列化:', (error as Error).message)
  }
  console.log()

  // 測試不可序列化的通知
  const badNotification = new BadNotification('ORD-456', () => {
    console.log('callback')
  })

  try {
    assertSerializable(badNotification)
    console.log('✅ 通知可序列化，通過檢查')
  } catch (error) {
    console.error('❌ 通知不可序列化:')
    console.error((error as Error).message)
  }
  console.log()
}

/**
 * 在 NotificationManager 中使用序列化守衛
 */
function example3_integrationWithManager() {
  console.log('=== 範例 3: 整合到 NotificationManager ===\n')

  // 模擬佇列推送前的檢查
  function pushToQueue(notification: Notification) {
    console.log(`準備推送通知到佇列: ${notification.constructor.name}`)

    // 檢查序列化
    const result = checkSerializable(notification)

    if (!result.serializable) {
      console.error('❌ 通知無法序列化，拒絕推送到佇列')
      console.error('問題路徑:', result.problematicPaths.join(', '))
      for (const warning of result.warnings) {
        console.error(`  - ${warning}`)
      }
      return false
    }

    console.log('✅ 通知可序列化，成功推送到佇列')
    return true
  }

  // 測試
  const good = new GoodNotification('ORD-123', 1500, new Date())
  pushToQueue(good)
  console.log()

  const bad = new BadNotification('ORD-456', () => {})
  pushToQueue(bad)
  console.log()
}

/**
 * 檢測複雜資料結構
 */
function example4_complexDataStructures() {
  console.log('=== 範例 4: 複雜資料結構 ===\n')

  const complexData = {
    // ✅ 可序列化
    name: 'Test',
    date: new Date(),
    tags: new Set(['admin', 'user']),
    metadata: new Map([['key', 'value']]),
    nested: {
      value: 123,
      array: [1, 2, 3],
    },

    // ❌ 不可序列化
    callback: () => {
      console.log('test')
    },
    symbolId: Symbol('id'),
    promise: Promise.resolve(1),
  }

  const result = checkSerializable(complexData)

  console.log('複雜資料結構檢查:')
  console.log('  可序列化:', result.serializable)
  console.log('  問題路徑:', result.problematicPaths)
  console.log('  警告訊息:')
  for (const warning of result.warnings) {
    console.log(`    - ${warning}`)
  }
  console.log()
}

/**
 * 執行所有範例
 */
function runAllExamples() {
  example1_checkSerializable()
  example2_assertSerializable()
  example3_integrationWithManager()
  example4_complexDataStructures()
}

// 執行範例
if (require.main === module) {
  runAllExamples()
}
