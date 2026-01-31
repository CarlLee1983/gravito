# Phase 4: Preference Driver (用戶偏好過濾) - 實作總結

## 概述

Phase 4 成功實作了用戶偏好過濾功能，允許用戶自訂接收通知的方式，包括：
- 啟用/禁用特定通道
- 禁用特定通知類型
- 支援自定義偏好提供者
- 完整的容錯機制

## 實作內容

### 1. 型別定義 (`src/types.ts`)

#### 新增 `NotificationPreference` 介面

```typescript
export interface NotificationPreference {
  getUserPreferences(notifiable: Notifiable): Promise<{
    enabledChannels: string[]
    disabledChannels: string[]
    disabledNotifications: string[]
  }>
}
```

#### 擴展 `Notifiable` 介面

```typescript
export interface Notifiable {
  // ... 現有方法
  getNotificationPreferences?(): Promise<{
    enabledChannels?: string[]
    disabledChannels?: string[]
    disabledNotifications?: string[]
  }>
}
```

### 2. PreferenceMiddleware (`src/middleware/PreferenceMiddleware.ts`)

#### 核心功能

1. **通道過濾**
   - 根據 `enabledChannels` 只允許特定通道
   - 根據 `disabledChannels` 禁用特定通道
   - `disabledChannels` 優先於 `enabledChannels`

2. **通知類型過濾**
   - 根據 `disabledNotifications` 禁用特定通知類型
   - 使用 `notification.constructor.name` 匹配通知類別

3. **容錯機制**
   - 偏好載入失敗時，記錄錯誤但允許通知發送
   - 確保系統在偏好服務不可用時仍能運作

4. **偏好來源優先級**
   - `Notifiable.getNotificationPreferences()` 優先
   - 自定義 `NotificationPreference` 提供者次之
   - 沒有偏好設定時，允許所有通道

#### 實作特點

```typescript
class PreferenceMiddleware implements ChannelMiddleware {
  readonly name = 'preference'

  constructor(private preferenceProvider?: NotificationPreference) {}

  async handle(
    notification: Notification,
    notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void> {
    // 1. 載入偏好設定（含容錯）
    // 2. 檢查通知類型是否被禁用
    // 3. 檢查通道是否被允許
    // 4. 所有檢查通過後，呼叫 next()
  }
}
```

### 3. OrbitFlare 配置更新 (`src/OrbitFlare.ts`)

#### 新增配置選項

```typescript
export interface OrbitFlareOptions {
  // ... 現有選項
  middleware?: ChannelMiddleware[]
  preferenceProvider?: NotificationPreference
  enablePreference?: boolean
}
```

#### 使用方式

```typescript
// 方式 1: 自動啟用
const flare = new OrbitFlare({
  enablePreference: true,
})

// 方式 2: 使用自定義提供者
const flare = new OrbitFlare({
  enablePreference: true,
  preferenceProvider: new DatabasePreferenceProvider(),
})

// 方式 3: 手動註冊
const flare = new OrbitFlare({
  middleware: [new PreferenceMiddleware(provider)],
})
```

### 4. 導出更新 (`src/index.ts`)

```typescript
// 新增導出
export { PreferenceMiddleware } from './middleware/PreferenceMiddleware'
export type { NotificationPreference } from './types'
```

## 測試覆蓋

### 單元測試 (`tests/PreferenceMiddleware.test.ts`)

**22 個測試案例**，涵蓋：

1. **基本功能** (3 tests)
   - 創建實例
   - 無偏好設定時允許所有通道
   - 自定義提供者

2. **禁用通道過濾** (2 tests)
   - 單一通道禁用
   - 多個通道禁用

3. **啟用通道過濾** (2 tests)
   - 單一通道啟用
   - 多個通道啟用

4. **優先級規則** (2 tests)
   - `disabledChannels` 優先於 `enabledChannels`
   - 同時存在時的行為

5. **禁用通知類型** (3 tests)
   - 單一通知類型禁用
   - 多個通知類型禁用
   - 通知類型過濾優先於通道過濾

6. **自定義提供者** (1 test)
   - 根據用戶 ID 返回不同偏好

7. **錯誤處理與容錯** (3 tests)
   - 偏好載入失敗
   - `getNotificationPreferences` 拋出錯誤
   - 偏好格式錯誤

8. **組合偏好來源** (2 tests)
   - 優先使用 Notifiable 的方法
   - Notifiable 無方法時使用提供者

9. **邊界情況** (4 tests)
   - 空陣列處理
   - undefined 處理

### 整合測試 (`tests/PreferenceMiddleware.integration.test.ts`)

**7 個測試案例**，涵蓋：

1. **與 NotificationManager 整合** (2 tests)
   - 通道過濾
   - 通知類型過濾

2. **與 RateLimitMiddleware 組合** (2 tests)
   - 中介層執行順序
   - 偏好過濾減少限流消耗

3. **自定義提供者整合** (1 test)
   - VIP vs 普通用戶

4. **多個中介層執行順序** (1 test)
   - 中介層鏈執行順序驗證

5. **容錯測試** (1 test)
   - 偏好載入失敗時的容錯行為

### 測試覆蓋率

```
File                                    | % Funcs | % Lines
----------------------------------------|---------|----------
src/middleware/PreferenceMiddleware.ts  |  100.00 |  100.00
All files                               |   89.62 |   92.39
```

- **PreferenceMiddleware**: 100% 覆蓋率
- **整體專案**: 89.62% Functions, 92.39% Lines
- **遠超過要求的 80% 覆蓋率**

## 使用範例

### 範例 1: 基本使用

```typescript
class User implements Notifiable {
  async getNotificationPreferences() {
    return {
      enabledChannels: ['email', 'database'],
      disabledChannels: ['sms'],
      disabledNotifications: ['MarketingNotification'],
    }
  }
}

const flare = new OrbitFlare({
  enableMail: true,
  enableSms: true,
  enablePreference: true,
})
```

### 範例 2: 資料庫提供者

```typescript
class DatabasePreferenceProvider implements NotificationPreference {
  async getUserPreferences(notifiable: Notifiable) {
    const userId = notifiable.getNotifiableId()
    const prefs = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    )
    return {
      enabledChannels: prefs.enabled_channels,
      disabledChannels: prefs.disabled_channels,
      disabledNotifications: prefs.disabled_notifications,
    }
  }
}

const flare = new OrbitFlare({
  enablePreference: true,
  preferenceProvider: new DatabasePreferenceProvider(),
})
```

### 範例 3: 角色基礎偏好

```typescript
class RoleBasedPreferenceProvider implements NotificationPreference {
  async getUserPreferences(notifiable: Notifiable) {
    const role = await this.getUserRole(notifiable.getNotifiableId())

    switch (role) {
      case 'admin':
        return {
          enabledChannels: ['email', 'sms', 'slack', 'database'],
          disabledChannels: [],
          disabledNotifications: [],
        }
      case 'vip':
        return {
          enabledChannels: ['email', 'sms', 'database'],
          disabledChannels: [],
          disabledNotifications: ['MarketingNotification'],
        }
      default:
        return {
          enabledChannels: ['email'],
          disabledChannels: [],
          disabledNotifications: [],
        }
    }
  }
}
```

### 範例 4: 與限流組合

```typescript
const flare = new OrbitFlare({
  middleware: [
    // 先過濾偏好（減少後續處理）
    new PreferenceMiddleware(new DatabasePreferenceProvider()),
    // 再應用限流
    new RateLimitMiddleware({
      email: { maxPerSecond: 10 },
      sms: { maxPerSecond: 5 },
    }),
  ],
})
```

## 技術決策

### 1. 偏好來源優先級

**決策**: `Notifiable.getNotificationPreferences()` > `NotificationPreference` 提供者

**理由**:
- 允許個別實體覆寫全域設定
- 提供最大靈活性
- 支援多租戶場景

### 2. 容錯機制

**決策**: 偏好載入失敗時，記錄錯誤但允許通知發送

**理由**:
- 確保系統可用性
- 通知系統是關鍵服務，不應因偏好服務故障而完全失效
- 記錄錯誤供後續診斷

### 3. 過濾優先級

**決策**:
1. 通知類型過濾（最優先）
2. 通道禁用（`disabledChannels`）
3. 通道啟用（`enabledChannels`）

**理由**:
- 最明確的禁止規則優先
- 符合用戶預期（明確禁用 > 明確啟用）
- 減少不必要的處理

### 4. 空陣列語義

**決策**:
- `enabledChannels: []` → 拒絕所有通道
- `disabledChannels: []` → 不影響其他規則
- `disabledNotifications: []` → 不影響通知發送

**理由**:
- 明確的空白列表表示「什麼都不要」
- 與 SQL `IN ()` 語義一致
- 避免混淆

## TDD 開發流程

### 步驟 1: 撰寫測試（RED）

- 建立 `PreferenceMiddleware.test.ts`
- 定義 22 個測試案例
- 執行測試，確認全部失敗

### 步驟 2: 最小實作（GREEN）

- 更新 `types.ts` 定義介面
- 實作 `PreferenceMiddleware`
- 執行測試，確認全部通過

### 步驟 3: 重構（REFACTOR）

- 優化程式碼結構
- 改善註解和文檔
- 確保測試仍然通過

### 步驟 4: 整合測試

- 建立 `PreferenceMiddleware.integration.test.ts`
- 測試與其他元件的整合
- 執行所有測試，確認全部通過

### 步驟 5: 覆蓋率驗證

- 執行覆蓋率檢查
- 確認達到 100% 覆蓋率
- 整體專案覆蓋率 > 80%

## 效能考量

### 1. 快取建議

```typescript
class CachedPreferenceProvider implements NotificationPreference {
  private cache = new Map<string | number, any>()
  private cacheTTL = 5 * 60 * 1000 // 5 分鐘

  async getUserPreferences(notifiable: Notifiable) {
    const userId = notifiable.getNotifiableId()
    const cached = this.cache.get(userId)

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.preferences
    }

    const preferences = await this.fetchFromDatabase(userId)
    this.cache.set(userId, { preferences, timestamp: Date.now() })

    return preferences
  }
}
```

### 2. 批次處理

對於批次通知，偏好只需載入一次：

```typescript
// NotificationManager 自動優化
await manager.sendMany(users, notification)
// 每個用戶的偏好只載入一次
```

### 3. 執行順序優化

將 PreferenceMiddleware 放在中介層鏈的前面，可以：
- 提早過濾不需要的通道
- 減少後續中介層的處理負擔
- 節省 CPU 和網路資源

## 未來擴展

### 1. 時間窗口過濾

```typescript
interface NotificationPreference {
  getUserPreferences(notifiable: Notifiable): Promise<{
    // ... 現有欄位
    quietHours?: {
      start: string // '22:00'
      end: string   // '08:00'
      timezone: string
    }
  }>
}
```

### 2. 頻率限制

```typescript
interface NotificationPreference {
  getUserPreferences(notifiable: Notifiable): Promise<{
    // ... 現有欄位
    maxPerDay?: {
      [notificationType: string]: number
    }
  }>
}
```

### 3. 優先級過濾

```typescript
interface NotificationPreference {
  getUserPreferences(notifiable: Notifiable): Promise<{
    // ... 現有欄位
    minPriority?: 'low' | 'normal' | 'high' | 'critical'
  }>
}
```

## 檔案清單

### 新增檔案

1. **核心實作**
   - `src/middleware/PreferenceMiddleware.ts` - 中介層實作

2. **測試**
   - `tests/PreferenceMiddleware.test.ts` - 單元測試 (22 tests)
   - `tests/PreferenceMiddleware.integration.test.ts` - 整合測試 (7 tests)

3. **範例**
   - `examples/preference-middleware-example.ts` - 10 個使用範例

4. **文檔**
   - `PHASE4_PREFERENCE_SUMMARY.md` - 此文件

### 修改檔案

1. `src/types.ts` - 新增 `NotificationPreference` 介面，擴展 `Notifiable` 介面
2. `src/OrbitFlare.ts` - 新增 `middleware`, `preferenceProvider`, `enablePreference` 配置
3. `src/index.ts` - 導出 `PreferenceMiddleware` 和 `NotificationPreference`

## 測試統計

```
Total Tests: 178 (22 unit + 7 integration + 149 existing)
Pass Rate: 100%
Coverage:
  - PreferenceMiddleware: 100%
  - Overall: 89.62% (Functions), 92.39% (Lines)
```

## 結論

Phase 4 成功實作了完整的用戶偏好過濾功能，包括：

✅ 完整的型別定義
✅ PreferenceMiddleware 實作
✅ OrbitFlare 配置整合
✅ 100% 測試覆蓋率（29 個測試）
✅ 完整的使用範例
✅ 容錯機制
✅ 與其他 middleware 完美整合
✅ TypeScript 類型檢查通過

所有功能均通過 TDD 流程開發，確保程式碼品質和可維護性。
