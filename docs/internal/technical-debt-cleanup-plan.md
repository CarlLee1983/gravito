# 技術債清理計畫 (Technical Debt Cleanup Plan)

**創建日期**: 2026-01-16  
**分支**: `tech-debt/comprehensive-cleanup`  
**狀態**: 📋 規劃完成，待實作  
**預估總工時**: ~20-25 小時

---

## 📊 技術債總覽

根據 2026-01-16 的 codebase 掃描，發現以下技術債：

| 類別 | 數量 | 嚴重度 | 所在位置 |
|------|------|--------|----------|
| TODO/FIXME/HACK | 18 處 | 🟡 Medium | 分散各 package |
| `any` 類型 | 1100+ 處 | 🔴 High | core, scaffold, tests |
| @ts-expect-error | 45 處 | 🟡 Medium | atlas tests, core |
| 空 catch 區塊 | 3 處 | 🟢 Low | pulsar, launchpad, cli |
| @deprecated API | 12 處 | 🟢 Low | 已有替代方案 |

---

## 🎯 Phase 5: Ripple RedisDriver 實現

### 5.1 概述
**優先級**: 🔴 P1 - High  
**預估工時**: 4 小時  
**影響範圍**: `packages/ripple`

### 5.2 問題描述
```typescript
// packages/ripple/src/RippleServer.ts:66
this.driver = config.driver === 'redis' ? new LocalDriver() : new LocalDriver() // TODO: RedisDriver
```
目前 Ripple WebSocket 服務器只支持 LocalDriver，無法在分佈式環境中同步客戶端連接狀態。

### 5.3 預期行為
- 當配置 `driver: 'redis'` 時，應使用 Redis Pub/Sub 進行跨實例廣播
- 支持橫向擴展的 WebSocket 架構

### 5.4 實現步驟

#### Step 5.4.1: 創建 RedisDriver 類
**文件**: `packages/ripple/src/drivers/RedisDriver.ts`

```typescript
import type { RippleDriver, ChannelMessage } from '../types'

export class RedisDriver implements RippleDriver {
  private redis: any // 使用 ioredis 或 redis 客戶端
  private subscriber: any
  private channelPrefix = 'ripple:'

  constructor(private config: RedisDriverConfig) {}

  async init(): Promise<void> {
    // 1. 初始化 Redis 連接
    // 2. 設置 Pub/Sub subscriber
  }

  async publish(channel: string, message: ChannelMessage): Promise<void> {
    // 發布消息到 Redis channel
  }

  subscribe(channel: string, handler: (message: ChannelMessage) => void): void {
    // 訂閱 Redis channel
  }

  async shutdown(): Promise<void> {
    // 關閉連接
  }
}

export interface RedisDriverConfig {
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
}
```

#### Step 5.4.2: 更新 RippleServer 配置
**文件**: `packages/ripple/src/RippleServer.ts`

```typescript
// 修改 constructor
constructor(config: RippleConfig = {}) {
  // ...
  this.driver = config.driver === 'redis' 
    ? new RedisDriver(config.redis ?? {}) 
    : new LocalDriver()
  // ...
}
```

#### Step 5.4.3: 更新類型定義
**文件**: `packages/ripple/src/types.ts`

```typescript
export interface RippleConfig {
  driver?: 'local' | 'redis'
  redis?: RedisDriverConfig
  // ... existing fields
}
```

#### Step 5.4.4: 添加測試
**文件**: `packages/ripple/tests/redis-driver.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { RedisDriver } from '../src/drivers/RedisDriver'

describe('RedisDriver', () => {
  // 使用 mock 或 testcontainers
  it('should publish and receive messages', async () => {})
  it('should handle reconnection', async () => {})
  it('should support channel prefix', async () => {})
})
```

### 5.5 驗收標準
- [ ] `RedisDriver` 類實現完成
- [ ] 配置 `driver: 'redis'` 時自動使用 RedisDriver
- [ ] 所有現有測試通過
- [ ] 新增 RedisDriver 單元測試
- [ ] 更新 README 文檔

### 5.6 依賴項
- 需要添加 `ioredis` 作為 optional peerDependency（參考 Atlas 的做法）

---

## 🎯 Phase 6: Pulsar Flash Data 實現

### 6.1 概述
**優先級**: 🔴 P1 - High  
**預估工時**: 2 小時  
**影響範圍**: `packages/pulsar`

### 6.2 問題描述
```typescript
// packages/pulsar/src/index.ts:200
// TODO: Implement flash data persistence logic
```
Flash data（一次性會話消息）的持久化邏輯未實現。

### 6.3 預期行為
```typescript
// 設置 flash 數據
ctx.session.flash('success', 'Item created!')

// 下一個請求中讀取（讀取後自動清除）
const message = ctx.session.get('success') // 'Item created!'
// 再次讀取
const message2 = ctx.session.get('success') // undefined
```

### 6.4 實現步驟

#### Step 6.4.1: 定位現有代碼
**文件**: `packages/pulsar/src/index.ts`

查看第 200 行附近的 flash 相關代碼，理解現有結構。

#### Step 6.4.2: 實現 Flash Data 邏輯

```typescript
// Session 類中添加
private flashData: Map<string, any> = new Map()
private newFlashData: Map<string, any> = new Map()

flash(key: string, value: any): void {
  this.newFlashData.set(key, value)
  this.modified = true
}

getFlash(key: string): any {
  const value = this.flashData.get(key)
  this.flashData.delete(key)
  return value
}

// 在 save() 方法中
async save(): Promise<void> {
  // 1. 將 newFlashData 序列化到 session store
  // 2. 清空 flashData
  // 3. 將 newFlashData 移至 flashData（下次請求用）
}

// 在 load() 方法中
async load(): Promise<void> {
  // 從 session store 載入 flashData
}
```

#### Step 6.4.3: 添加測試
**文件**: `packages/pulsar/tests/flash.test.ts`

```typescript
describe('Session Flash Data', () => {
  it('should store flash data for next request', async () => {})
  it('should clear flash data after read', async () => {})
  it('should persist flash data to store', async () => {})
  it('should handle multiple flash keys', async () => {})
})
```

### 6.5 驗收標準
- [ ] `flash()` 方法正確存儲數據
- [ ] `getFlash()` 讀取後自動清除
- [ ] Flash data 在請求間正確持久化
- [ ] 所有現有測試通過
- [ ] 新增 flash 相關測試

---

## 🎯 Phase 7: Fortify Email 整合

### 7.1 概述
**優先級**: 🟡 P2 - Medium  
**預估工時**: 2 小時  
**影響範圍**: `packages/fortify`

### 7.2 問題描述
```typescript
// packages/fortify/src/controllers/VerifyEmailController.ts:136
// TODO: Send email with verification link

// packages/fortify/src/controllers/ForgotPasswordController.ts:66
// TODO: Send email with reset link
```

### 7.3 實現步驟

#### Step 7.3.1: 創建郵件模板類
**文件**: `packages/fortify/src/mail/VerifyEmailMail.ts`

```typescript
import { Mailable } from '@gravito/signal'

export class VerifyEmailMail extends Mailable {
  constructor(
    private user: { email: string; name?: string },
    private verificationUrl: string
  ) {
    super()
  }

  async build() {
    return this
      .to(this.user.email)
      .subject('Verify Your Email Address')
      .html(`
        <h1>Hello ${this.user.name ?? 'there'}!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${this.verificationUrl}">Verify Email</a>
        <p>If you did not create an account, no further action is required.</p>
      `)
  }
}
```

**文件**: `packages/fortify/src/mail/ResetPasswordMail.ts`

```typescript
import { Mailable } from '@gravito/signal'

export class ResetPasswordMail extends Mailable {
  constructor(
    private user: { email: string; name?: string },
    private resetUrl: string
  ) {
    super()
  }

  async build() {
    return this
      .to(this.user.email)
      .subject('Reset Your Password')
      .html(`
        <h1>Password Reset Request</h1>
        <p>You are receiving this email because we received a password reset request.</p>
        <a href="${this.resetUrl}">Reset Password</a>
        <p>This link will expire in 60 minutes.</p>
      `)
  }
}
```

#### Step 7.3.2: 更新 VerifyEmailController
**文件**: `packages/fortify/src/controllers/VerifyEmailController.ts`

```typescript
// 替換 TODO 註釋
import { VerifyEmailMail } from '../mail/VerifyEmailMail'

// 在適當位置
const mail = new VerifyEmailMail(user, verificationUrl)
await mail.send(this.mailService)
```

#### Step 7.3.3: 更新 ForgotPasswordController
**文件**: `packages/fortify/src/controllers/ForgotPasswordController.ts`

```typescript
// 替換 TODO 註釋
import { ResetPasswordMail } from '../mail/ResetPasswordMail'

// 在適當位置
const mail = new ResetPasswordMail(user, resetUrl)
await mail.send(this.mailService)
```

### 7.4 驗收標準
- [ ] 郵件模板類實現
- [ ] VerifyEmailController 正確發送郵件
- [ ] ForgotPasswordController 正確發送郵件
- [ ] 郵件內容可自定義（via config 或繼承）
- [ ] 更新 package.json 添加 @gravito/signal 依賴

---

## 🎯 Phase 8: Core `any` 類型精簡

### 8.1 概述
**優先級**: 🟡 P2 - Medium  
**預估工時**: 3 小時  
**影響範圍**: `packages/core/src`

### 8.2 問題描述
Core package 中有約 55 處 `any` 類型使用，主要分佈在：
- `Route.ts` - 靜態方法簽名 (12 處)
- `runtime.ts` - Deno 兼容層 (10 處)
- `BunNativeAdapter.ts` - context 處理 (6 處)
- `testing/` 目錄 (12 處)
- 其他 (15 處)

### 8.3 分類處理策略

#### Category A: 可改為 `unknown` (低風險)
```typescript
// Before
catch (error: any) { ... }

// After
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
}
```

#### Category B: 需要泛型 (中風險)
```typescript
// Before
json(data: any, status?: number): Response

// After
json<T>(data: T, status?: number): Response
```

#### Category C: 跨 runtime 兼容 - 需評估 (高風險)
```typescript
// runtime.ts 中的 Deno 訪問
const deno = (globalThis as any).Deno
```
**建議**: 創建 `types/deno.d.ts` 聲明文件，或保持 `any`（有正當理由）

#### Category D: 測試代碼 (可接受)
測試中的 `any` 可以暫時保留，但建議逐步改善。

### 8.4 實現步驟

#### Step 8.4.1: Route.ts 類型改善
**文件**: `packages/core/src/Route.ts`

1. 保持函數重載簽名（Phase 分析已確認需要）
2. 內部實現改用 `unknown` + type guards

```typescript
// 改善內部實現
static get(path: string, requestOrHandlerOrMiddleware: unknown, handler?: unknown): Route {
  return router().get(path, requestOrHandlerOrMiddleware, handler)
}
```

#### Step 8.4.2: runtime.ts Deno 類型
**文件**: `packages/core/src/types/deno.d.ts`

```typescript
declare global {
  // 可選: 聲明 Deno 類型
  // 或使用 @types/deno（如可用）
}
```

#### Step 8.4.3: catch 區塊標準化
使用 search & replace 將 `catch (error: any)` 改為：
```typescript
catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error))
  // 使用 err.message, err.stack 等
}
```

### 8.5 驗收標準
- [ ] Category A: 所有 catch 區塊改用 `unknown`
- [ ] Category B: 評估泛型重構可行性
- [ ] Category C: 記錄跨 runtime `any` 的原因
- [ ] `bun run typecheck` 通過
- [ ] 所有測試通過

---

## 🎯 Phase 9: 空 Catch 區塊修復

### 9.1 概述
**優先級**: 🟢 P3 - Low  
**預估工時**: 30 分鐘  
**影響範圍**: 3 個文件

### 9.2 問題位置

| 文件 | 行號 | 上下文 |
|------|------|--------|
| `packages/pulsar/src/index.ts` | 317 | `} catch (_e) {}` |
| `packages/launchpad/debug-launch.ts` | 24 | `} catch (_e) {}` |
| `packages/cli/src/commands/add.ts` | 75 | `} catch (_e) {}` |

### 9.3 處理策略

對每個空 catch：
1. **分析**：確認是否需要錯誤處理
2. **決策**：
   - 需要處理 → 添加適當的 error handling
   - 故意忽略 → 添加註釋說明原因

### 9.4 修復範例

```typescript
// Before
} catch (_e) {}

// After (Option A: 添加 logging)
} catch (error) {
  console.error('[ModuleName] Failed to perform action:', error)
}

// After (Option B: 故意忽略，添加註釋)
} catch {
  // Intentionally ignored: operation is best-effort and failure is acceptable
}
```

### 9.5 驗收標準
- [ ] 所有空 catch 區塊已處理
- [ ] 添加適當註釋或錯誤處理
- [ ] Linting 無警告

---

## 🎯 Phase 10: @deprecated API 清理評估

### 10.1 概述
**優先級**: 🟢 P3 - Low  
**預估工時**: 1 小時  
**類型**: 評估 & 文檔

### 10.2 現有 Deprecated API 清單

| 位置 | 描述 | 替代方案 | 移除版本 |
|------|------|----------|----------|
| signal/Queueable.ts:7 | Queueable type | `import from '@gravito/stream'` | - |
| atlas/Grammar.ts:205 | compileWhere | compileWhereWithOffset | - |
| beam/index.ts:81 | old API | createBeam | - |
| cosmos/index.ts:34 | old export | OrbitCosmos | v4.0.0 |
| stasis/index.ts:33,274 | CacheStorageProvider | CacheStorage + OrbitStasis | - |
| core/types.ts:82 | ctx.matchedRoute | ctx.route() | - |
| core/PlanetCore.ts:98,118 | direct property | adapter methods, container | - |
| nebula/index.ts:124,245 | old options | OrbitNebulaOptions, OrbitNebula | - |

### 10.3 行動建議

1. **文檔更新**：確保所有 deprecated API 有清晰的遷移指南
2. **版本規劃**：設定明確的移除時間表
3. **Deprecation 警告**：考慮添加 runtime warning

### 10.4 驗收標準
- [ ] 創建 `docs/MIGRATION.md` 遷移指南
- [ ] 所有 deprecated API 有明確移除版本
- [ ] 考慮是否添加 deprecation runtime warning

---

## 📋 實施順序建議

```
Phase 5 (Ripple Redis)     ████████░░ 4h   Priority: P1
         ↓
Phase 6 (Pulsar Flash)     ████░░░░░░ 2h   Priority: P1
         ↓
Phase 7 (Fortify Email)    ████░░░░░░ 2h   Priority: P2
         ↓
Phase 8 (Core any types)   ██████░░░░ 3h   Priority: P2
         ↓
Phase 9 (Empty catch)      █░░░░░░░░░ 0.5h Priority: P3
         ↓
Phase 10 (Deprecated)      ██░░░░░░░░ 1h   Priority: P3
```

**總計**: ~12.5 小時核心工作 + 緩衝時間

---

## ✅ 完成檢查清單

### 每個 Phase 完成後：
- [ ] 代碼變更提交
- [ ] `bun run typecheck` 通過
- [ ] `bun test` 全部通過
- [ ] PR Review 完成
- [ ] 更新此文檔狀態

### 全部完成後：
- [ ] 合併到 main
- [ ] 更新 CHANGELOG
- [ ] 發布版本（如適用）

---

## 📝 附註

### 關於測試中的 `any` 類型
測試檔案（`*.test.ts`）中的 `any` 使用暫時保留，因為：
1. Mock 對象通常需要部分實現
2. 對測試代碼的類型安全要求較低
3. 改善投入/回報比不高

未來可作為獨立任務逐步改善。

### 關於 Scaffold Package
Scaffold 生成的代碼模板中的 `any` 和 TODO 保持現狀，因為：
1. 生成的代碼會被用戶修改
2. 它們是 placeholder 而非真正的技術債
3. 需要保持生成代碼的簡潔性

---

**文檔維護者**: @AI  
**最後更新**: 2026-01-16
