/**
 * PreferenceMiddleware 使用範例
 *
 * 此範例展示如何使用 PreferenceMiddleware 實作用戶通知偏好過濾。
 */

import {
  type Notifiable,
  type NotificationPreference,
  OrbitFlare,
  PreferenceMiddleware,
} from '../src'
import { Notification } from '../src/Notification'

// ===========================
// 範例 1: 使用 Notifiable 的偏好設定
// ===========================

class User implements Notifiable {
  constructor(
    private id: string,
    private preferences: {
      enabledChannels?: string[]
      disabledChannels?: string[]
      disabledNotifications?: string[]
    }
  ) {}

  getNotifiableId(): string {
    return this.id
  }

  getNotifiableType(): string {
    return 'user'
  }

  async getNotificationPreferences() {
    return this.preferences
  }
}

// 建立用戶：只接收 email 通知
const _user = new User('user-123', {
  enabledChannels: ['email'],
})

// 在 OrbitFlare 中啟用 PreferenceMiddleware
const _flare = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  enablePreference: true, // 自動啟用 PreferenceMiddleware
})

// ===========================
// 範例 2: 使用自定義 NotificationPreference 提供者
// ===========================

// 從資料庫載入用戶偏好
class DatabasePreferenceProvider implements NotificationPreference {
  async getUserPreferences(notifiable: Notifiable) {
    // 從資料庫查詢用戶偏好
    const userId = notifiable.getNotifiableId()
    const prefs = await this.fetchFromDatabase(userId)

    return {
      enabledChannels: prefs.enabled_channels || [],
      disabledChannels: prefs.disabled_channels || [],
      disabledNotifications: prefs.disabled_notifications || [],
    }
  }

  private async fetchFromDatabase(_userId: string | number) {
    // 實際的資料庫查詢邏輯
    // 這裡使用假資料示範
    return {
      enabled_channels: ['email', 'database'],
      disabled_channels: ['sms'],
      disabled_notifications: ['MarketingNotification'],
    }
  }
}

const _flareWithDbProvider = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  enablePreference: true,
  preferenceProvider: new DatabasePreferenceProvider(),
})

// ===========================
// 範例 3: 手動註冊 PreferenceMiddleware
// ===========================

// 如果需要更精細的控制，可以手動註冊
const _flareManual = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  middleware: [
    new PreferenceMiddleware(new DatabasePreferenceProvider()),
    // 可以添加更多自定義中介層
  ],
})

// ===========================
// 範例 4: 禁用特定通知類型
// ===========================

class MarketingNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms']
  }
}

class SecurityAlertNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms', 'database']
  }
}

// 用戶禁用行銷通知
const _userWithDisabledMarketing = new User('user-456', {
  disabledNotifications: ['MarketingNotification'],
})

// MarketingNotification 將被跳過
// SecurityAlertNotification 正常發送

// ===========================
// 範例 5: 多層級偏好設定
// ===========================

// VIP 用戶：接收所有通道的通知
const _vipUser = new User('vip-789', {
  enabledChannels: ['email', 'sms', 'slack', 'database'],
})

// 普通用戶：只接收 email 和 database 通知
const _normalUser = new User('normal-123', {
  enabledChannels: ['email', 'database'],
})

// 受限用戶：禁用所有即時通知，只保留 database
const _restrictedUser = new User('restricted-456', {
  disabledChannels: ['email', 'sms', 'slack'],
  enabledChannels: ['database'],
})

// ===========================
// 範例 6: 動態偏好提供者（基於用戶角色）
// ===========================

class RoleBasedPreferenceProvider implements NotificationPreference {
  async getUserPreferences(notifiable: Notifiable) {
    // 假設我們可以從 notifiable 獲取用戶角色
    const userId = notifiable.getNotifiableId()
    const role = await this.getUserRole(userId)

    switch (role) {
      case 'admin':
        // 管理員接收所有通知
        return {
          enabledChannels: ['email', 'sms', 'slack', 'database'],
          disabledChannels: [],
          disabledNotifications: [],
        }

      case 'vip':
        // VIP 用戶不接收行銷通知
        return {
          enabledChannels: ['email', 'sms', 'database'],
          disabledChannels: [],
          disabledNotifications: ['MarketingNotification'],
        }
      default:
        // 基本用戶只接收 email
        return {
          enabledChannels: ['email'],
          disabledChannels: [],
          disabledNotifications: [],
        }
    }
  }

  private async getUserRole(_userId: string | number): Promise<string> {
    // 從資料庫或快取獲取用戶角色
    return 'basic'
  }
}

const _flareWithRoleProvider = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  enableSlack: true,
  enablePreference: true,
  preferenceProvider: new RoleBasedPreferenceProvider(),
})

// ===========================
// 範例 7: 與 RateLimitMiddleware 組合使用
// ===========================

import { RateLimitMiddleware } from '../src'

const _flareWithBothMiddleware = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  middleware: [
    // 先過濾偏好（減少後續處理）
    new PreferenceMiddleware(new DatabasePreferenceProvider()),
    // 再應用限流
    new RateLimitMiddleware({
      email: { maxPerSecond: 10, maxPerMinute: 100 },
      sms: { maxPerSecond: 5, maxPerMinute: 50 },
    }),
  ],
})

// ===========================
// 範例 8: 快取偏好設定（提高性能）
// ===========================

class CachedPreferenceProvider implements NotificationPreference {
  private cache = new Map<string | number, any>()
  private cacheTTL = 5 * 60 * 1000 // 5 分鐘

  async getUserPreferences(notifiable: Notifiable) {
    const userId = notifiable.getNotifiableId()
    const cached = this.cache.get(userId)

    // 檢查快取
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.preferences
    }

    // 從資料庫載入
    const preferences = await this.fetchFromDatabase(userId)

    // 存入快取
    this.cache.set(userId, {
      preferences,
      timestamp: Date.now(),
    })

    return preferences
  }

  private async fetchFromDatabase(_userId: string | number) {
    // 實際的資料庫查詢
    return {
      enabledChannels: ['email'],
      disabledChannels: [],
      disabledNotifications: [],
    }
  }
}

const _flareWithCache = new OrbitFlare({
  enableMail: true,
  enablePreference: true,
  preferenceProvider: new CachedPreferenceProvider(),
})

// ===========================
// 範例 9: 容錯處理
// ===========================

class FallbackPreferenceProvider implements NotificationPreference {
  async getUserPreferences(notifiable: Notifiable) {
    try {
      // 嘗試從主資料庫載入
      return await this.fetchFromPrimaryDatabase(notifiable.getNotifiableId())
    } catch (error) {
      console.error('Primary database failed, using fallback:', error)

      try {
        // 嘗試從快取載入
        return await this.fetchFromCache(notifiable.getNotifiableId())
      } catch (cacheError) {
        console.error('Cache failed, using default preferences:', cacheError)

        // 返回預設偏好
        return {
          enabledChannels: ['email'], // 預設只啟用 email
          disabledChannels: [],
          disabledNotifications: [],
        }
      }
    }
  }

  private async fetchFromPrimaryDatabase(_userId: string | number) {
    throw new Error('Database connection failed')
  }

  private async fetchFromCache(_userId: string | number) {
    throw new Error('Cache not available')
  }
}

// PreferenceMiddleware 內建容錯機制：
// 如果偏好載入失敗，會記錄錯誤但允許通知繼續發送

// ===========================
// 範例 10: 使用方式總結
// ===========================

export const exampleUsage = {
  // 方式 1: 自動啟用（最簡單）
  automatic: new OrbitFlare({
    enablePreference: true,
  }),

  // 方式 2: 使用自定義提供者
  withProvider: new OrbitFlare({
    enablePreference: true,
    preferenceProvider: new DatabasePreferenceProvider(),
  }),

  // 方式 3: 手動註冊（最靈活）
  manual: new OrbitFlare({
    middleware: [new PreferenceMiddleware(new DatabasePreferenceProvider())],
  }),
}
