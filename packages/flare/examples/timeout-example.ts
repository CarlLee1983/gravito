/**
 * TimeoutChannel 使用範例
 *
 * 展示如何為各種 Channel 配置 timeout 功能。
 */

import {
  MailChannel,
  type Notifiable,
  Notification,
  SlackChannel,
  SmsChannel,
  TimeoutChannel,
} from '@gravito/flare'

// ==========================================
// 範例 1: SlackChannel 使用內建 Timeout
// ==========================================

const slackChannel = new SlackChannel({
  webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  defaultChannel: '#notifications',
  timeout: 5000, // 5 秒 timeout
  onTimeout: (channel, _notification) => {
    console.error(`Slack notification timeout: ${channel}`)
    // 可以在這裡記錄到監控系統或發送警報
  },
})

// ==========================================
// 範例 2: SmsChannel 使用內建 Timeout
// ==========================================

const _smsChannel = new SmsChannel({
  provider: 'twilio',
  apiKey: process.env.TWILIO_API_KEY,
  apiSecret: process.env.TWILIO_API_SECRET,
  from: '+1234567890',
  timeout: 10000, // 10 秒 timeout
  onTimeout: (channel, _notification) => {
    console.error(`SMS notification timeout: ${channel}`)
  },
})

// ==========================================
// 範例 3: MailChannel 使用內建 Timeout
// ==========================================

const _mailChannel = new MailChannel(
  {
    send: async (message) => {
      // 你的郵件發送邏輯
      console.log(`Sending email to ${message.to}`)
    },
  },
  {
    timeout: 15000, // 15 秒 timeout
    onTimeout: (channel, _notification) => {
      console.error(`Mail notification timeout: ${channel}`)
    },
  }
)

// ==========================================
// 範例 4: 使用 TimeoutChannel 裝飾器
// ==========================================

// 建立一個自訂 Channel
class CustomChannel {
  async send(_notification: Notification, notifiable: Notifiable): Promise<void> {
    // 自訂發送邏輯
    console.log(`Sending custom notification to ${notifiable.getNotifiableId()}`)
  }
}

// 使用 TimeoutChannel 包裝它
const customChannel = new CustomChannel()
const _timeoutChannel = new TimeoutChannel(customChannel, {
  timeout: 3000, // 3 秒 timeout
  onTimeout: (channel, _notification) => {
    console.error(`Custom channel timeout: ${channel}`)
  },
})

// ==========================================
// 範例 3: 自定義通道類別 (封裝超時邏輯)
// ==========================================

export class AdaptiveSlackChannel {
  constructor(private baseTimeout = 5000) {
    this.channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      timeout: this.baseTimeout,
    })
  }

  // 根據負載動態調整 timeout
  updateTimeout(newTimeout: number) {
    // 重新建立 channel
    this.channel = new SlackChannel({
      webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      timeout: newTimeout,
      onTimeout: (_channel, _notification) => {
        console.error(`Timeout after ${newTimeout}ms`)
        // 自動增加 timeout
        this.updateTimeout(newTimeout * 1.5)
      },
    })
  }
}

// ==========================================
// 範例 6: 使用 Notification
// ==========================================

class WelcomeNotification extends Notification {
  constructor(private userName: string) {
    super()
  }

  via() {
    return ['slack', 'mail']
  }

  toSlack() {
    return {
      text: `Welcome ${this.userName}!`,
      channel: '#general',
    }
  }

  toMail() {
    return {
      subject: 'Welcome!',
      to: 'user@example.com',
      text: `Welcome ${this.userName}!`,
    }
  }
}

// 使用範例
async function _example() {
  const notifiable: Notifiable = {
    getNotifiableId: () => 'user-123',
  }

  const notification = new WelcomeNotification('Carl')

  try {
    await slackChannel.send(notification, notifiable)
    console.log('Notification sent successfully')
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('Notification timeout:', error.message)
    } else {
      console.error('Notification failed:', error)
    }
  }
}

// ==========================================
// 最佳實踐建議
// ==========================================

/**
 * 1. 根據 Channel 類型設定合理的 timeout：
 *    - Slack: 5-10 秒
 *    - SMS: 10-15 秒
 *    - Email: 15-30 秒
 *    - Database: 3-5 秒
 *
 * 2. 使用 onTimeout 回調進行監控：
 *    - 記錄到日誌系統
 *    - 發送警報到監控平台
 *    - 記錄失敗的通知以便後續重試
 *
 * 3. 結合 Retry 機制使用：
 *    - Timeout 發生後可以自動重試
 *    - 使用 exponential backoff
 *
 * 4. 測試不同負載下的 timeout 設定：
 *    - 使用壓力測試找出最佳 timeout 值
 *    - 根據實際情況動態調整
 */
