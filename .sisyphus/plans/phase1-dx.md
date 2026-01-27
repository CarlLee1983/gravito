# Phase 1: Developer Experience (DX) 執行計畫

## Context

### 原始需求
Gravito Core 改進藍圖的第一階段，專注於提升開發者體驗（Developer Experience）。

### 範圍概覽
| 子任務 | 目標套件 | 核心技術 |
|--------|---------|----------|
| 1. Core IoC 類型安全 | `@gravito/core` | TypeScript Module Augmentation |
| 2. Monolith 熱重載 | `@gravito/monolith` | `node:fs` watch / `Bun.file().watch()` |
| 3. Ripple Client 重構 | `@gravito/ripple-client` | API 優化、TypeScript 強化 |

### 研究發現

**Container.ts 現狀**:
- `make<T>(key: BindingKey): T` 使用手動泛型，無自動推斷
- `BindingKey = string | symbol`
- 無現有 `ServiceMap` 或介面合併模式
- 但 `GravitoVariables` 已使用 module augmentation 模式（可參考）

**ContentManager.ts 現狀**:
- 使用 `Map<string, ContentItem>` 快取，key 格式為 `collection:locale:slug`
- 無 `clearCache()` 方法
- 無 `fs.watch` 整合
- `find()` 和 `list()` 方法填充快取

**RippleClient.ts 現狀**:
- 已實作 Laravel Echo 風格 API（`.channel()`, `.private()`, `.join()`）
- 已有 `Channel`, `PrivateChannel`, `PresenceChannel` 類別
- 有 React 和 Vue 綁定
- 需要重構優化而非從頭建立

---

## Work Objectives

### 核心目標
為 Gravito 開發者提供更流暢的開發體驗：自動類型推斷、即時內容更新、更優雅的 WebSocket 客戶端。

### 具體交付物
1. **ServiceMap 類型系統** - `Container.make('key')` 自動推斷返回類型
2. **開發環境熱重載** - 檔案變更時自動清除 ContentManager 快取
3. **RippleClient 重構** - 更好的 TypeScript 支援、統一的 API 風格

### 完成定義
- [ ] `bun test` 所有受影響套件測試通過
- [ ] `bun tsc -p tsconfig.json --noEmit` 類型檢查通過
- [ ] 文件更新反映新 API

### 必須包含
- 完整的 TypeScript 類型支援
- 向後相容性（不破壞現有 API）
- 開發/生產環境區分（熱重載僅在 development）

### 不得包含（防護欄）
- 不修改核心 Container 解析邏輯
- 不新增外部依賴（watch 功能使用 Node.js/Bun 原生）
- 不變更 Ripple 通訊協議
- 不實作 encrypted channels（超出範圍）
- 不新增測試以外的程式碼覆蓋工具

---

## Verification Strategy

### 測試決策
- **基礎設施存在**: YES（Bun test）
- **使用者要求測試**: TDD
- **框架**: `bun:test`

### TDD 工作流程
每個 TODO 遵循 RED-GREEN-REFACTOR：

1. **RED**: 先寫失敗測試
   - 測試命令: `bun test [file]`
   - 預期: FAIL（測試存在，實作不存在）
2. **GREEN**: 實作最小程式碼使測試通過
   - 命令: `bun test [file]`
   - 預期: PASS
3. **REFACTOR**: 清理程式碼同時保持綠燈

### 整體驗證命令
```bash
# 類型檢查
bun tsc -p packages/core/tsconfig.json --noEmit
bun tsc -p packages/monolith/tsconfig.json --noEmit
bun tsc -p packages/ripple-client/tsconfig.json --noEmit

# 測試
bun test --filter='packages/core'
bun test --filter='packages/monolith'
bun test --filter='packages/ripple-client'

# 全部
turbo run test --filter='./packages/core' --filter='./packages/monolith' --filter='./packages/ripple-client'
```

---

## Task Flow

```
Task 1.1 → Task 1.2 → Task 1.3 (ServiceMap 類型系統)
                            ↓
Task 2.1 → Task 2.2 → Task 2.3 (ContentManager 熱重載)
                            ↓
Task 3.1 → Task 3.2 → Task 3.3 → Task 3.4 (RippleClient 重構)
```

## Parallelization

| 群組 | 任務 | 原因 |
|------|------|------|
| A | 1.x, 2.x, 3.x | 三個子專案相互獨立，可平行開發 |

| 任務 | 依賴 | 原因 |
|------|------|------|
| 1.2 | 1.1 | 需要類型定義才能更新 Container |
| 2.2 | 2.1 | 需要清除方法才能實作 watcher |
| 3.2 | 3.1 | 需要類型基礎才能重構 Client |

---

## TODOs

---

### 子專案 1: Core ServiceMap 類型安全

---

- [ ] 1.1 定義 ServiceMap 介面與類型基礎

  **What to do**:
  - 在 `packages/core/src/Container.ts` 新增 `ServiceMap` 介面定義
  - 使用 TypeScript Declaration Merging 模式
  - 建立空介面供外部套件擴展

  ```typescript
  // 新增到 Container.ts
  
  /**
   * ServiceMap 介面，用於 IoC 容器的類型安全解析。
   * 
   * 透過 module augmentation 擴展此介面以獲得類型推斷：
   * @example
   * ```typescript
   * declare module '@gravito/core' {
   *   interface ServiceMap {
   *     logger: Logger
   *     db: DatabaseConnection
   *   }
   * }
   * 
   * const logger = container.make('logger') // 自動推斷為 Logger
   * ```
   */
  export interface ServiceMap {
    // 由各 Orbit/Satellite 透過 module augmentation 擴展
  }
  
  /**
   * 有效的服務鍵類型
   */
  export type ServiceKey = keyof ServiceMap | (string & {}) | symbol
  ```

  **Must NOT do**:
  - 不修改現有 `BindingKey` 類型的用途
  - 不強制所有服務都必須在 ServiceMap 中註冊

  **Parallelizable**: YES（與 2.x, 3.x 平行）

  **References**:

  **Pattern References**:
  - `packages/core/src/http/types.ts:57-96` - `GravitoVariables` 的 module augmentation 模式（直接參考）
  
  **API/Type References**:
  - `packages/core/src/Container.ts:6` - 現有 `BindingKey` 定義
  - `packages/core/src/Container.ts:82-103` - 現有 `make<T>()` 方法簽名
  
  **External References**:
  - TypeScript Handbook: Declaration Merging - https://www.typescriptlang.org/docs/handbook/declaration-merging.html

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/core/tests/service-map.test.ts`
  - [ ] `bun test packages/core/tests/service-map.test.ts` → PASS
  - [ ] `ServiceMap` 介面可被 `declare module` 擴展
  - [ ] 擴展後的鍵在 IDE 中有自動補全

  **Commit**: YES
  - Message: `feat(core): add ServiceMap interface for IoC type inference`
  - Files: `packages/core/src/Container.ts`, `packages/core/tests/service-map.test.ts`
  - Pre-commit: `bun test packages/core/tests/service-map.test.ts`

---

- [ ] 1.2 實作類型安全的 make() 重載

  **What to do**:
  - 新增 `make()` 方法的函數重載
  - 當 key 在 `ServiceMap` 中時，自動推斷返回類型
  - 當 key 不在 `ServiceMap` 中時，回退到手動泛型

  ```typescript
  /**
   * 類型安全的服務解析（當 key 在 ServiceMap 中）
   */
  make<K extends keyof ServiceMap>(key: K): ServiceMap[K]
  
  /**
   * 手動類型的服務解析（向後相容）
   */
  make<T>(key: BindingKey): T
  
  /**
   * 實作
   */
  make<T>(key: BindingKey): T {
    // 現有邏輯不變
  }
  ```

  **Must NOT do**:
  - 不修改解析邏輯（只改變類型層面）
  - 不破壞 `make<T>('custom-key')` 的向後相容性

  **Parallelizable**: NO（依賴 1.1）

  **References**:

  **Pattern References**:
  - `packages/core/src/Container.ts:82-103` - 現有 `make()` 實作（在此基礎上加重載）
  
  **Test References**:
  - `packages/core/tests/ioc.test.ts` - IoC 容器測試模式

  **Acceptance Criteria**:
  - [ ] 新增測試到 `packages/core/tests/service-map.test.ts`
  - [ ] `bun test packages/core/tests/service-map.test.ts` → PASS
  - [ ] TypeScript 編譯器正確推斷類型（在測試中驗證）
  - [ ] 現有 `make<T>()` 用法仍然有效

  **Manual Verification**:
  ```typescript
  // 在 REPL 或測試中驗證類型推斷
  declare module '@gravito/core' {
    interface ServiceMap {
      testService: { name: string }
    }
  }
  
  const service = container.make('testService')
  // hover 應顯示: const service: { name: string }
  ```

  **Commit**: YES
  - Message: `feat(core): implement type-safe make() overloads for ServiceMap`
  - Files: `packages/core/src/Container.ts`, `packages/core/tests/service-map.test.ts`
  - Pre-commit: `bun test packages/core/tests/`

---

- [ ] 1.3 更新文件與匯出

  **What to do**:
  - 在 `packages/core/src/index.ts` 匯出 `ServiceMap` 和 `ServiceKey`
  - 更新 `packages/core/README.md` 新增使用範例

  **Must NOT do**:
  - 不移除現有匯出

  **Parallelizable**: NO（依賴 1.2）

  **References**:
  
  **Documentation References**:
  - `packages/core/README.md:109-120` - Container API 文件區塊

  **Acceptance Criteria**:
  - [ ] `ServiceMap` 和 `ServiceKey` 可從 `@gravito/core` 匯入
  - [ ] README 包含 module augmentation 範例
  - [ ] `bun tsc -p packages/core/tsconfig.json --noEmit` → PASS

  **Commit**: YES
  - Message: `docs(core): add ServiceMap usage examples to README`
  - Files: `packages/core/src/index.ts`, `packages/core/README.md`
  - Pre-commit: `bun tsc -p packages/core/tsconfig.json --noEmit`

---

### 子專案 2: Monolith ContentManager 熱重載

---

- [ ] 2.1 新增快取清除方法

  **What to do**:
  - 在 `ContentManager` 新增 `clearCache()` 方法
  - 在 `ContentManager` 新增 `invalidate(key)` 方法
  - 新增 `getCacheKey()` 靜態輔助方法

  ```typescript
  /**
   * 清除所有快取內容。
   * 用於開發環境熱重載或手動刷新。
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * 使特定快取項目失效。
   * @param collection - 集合名稱
   * @param slug - 檔案 slug
   * @param locale - 語系（預設 'en'）
   */
  invalidate(collection: string, slug: string, locale = 'en'): void {
    const cacheKey = `${collection}:${locale}:${slug}`
    this.cache.delete(cacheKey)
  }
  
  /**
   * 根據檔案路徑使快取失效。
   * @param filePath - 相對於 rootDir 的檔案路徑
   */
  invalidateByPath(filePath: string): void {
    // 解析路徑為 collection:locale:slug 並刪除
  }
  ```

  **Must NOT do**:
  - 不修改現有 `find()` 或 `list()` 邏輯
  - 不自動啟用任何 watcher

  **Parallelizable**: YES（與 1.x, 3.x 平行）

  **References**:

  **Pattern References**:
  - `packages/monolith/src/ContentManager.ts:87-88` - 現有快取鍵格式 `collection:locale:slug`
  - `packages/monolith/src/ContentManager.ts:94` - 檔案路徑解析邏輯
  
  **Test References**:
  - `packages/monolith/tests/content.test.ts` - ContentManager 測試模式

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/monolith/tests/content-cache.test.ts`
  - [ ] `bun test packages/monolith/tests/content-cache.test.ts` → PASS
  - [ ] `clearCache()` 清除所有快取項目
  - [ ] `invalidate()` 只清除指定項目
  - [ ] `invalidateByPath()` 正確解析路徑並清除

  **Commit**: YES
  - Message: `feat(monolith): add cache invalidation methods to ContentManager`
  - Files: `packages/monolith/src/ContentManager.ts`, `packages/monolith/tests/content-cache.test.ts`
  - Pre-commit: `bun test packages/monolith/tests/`

---

- [ ] 2.2 實作檔案監視器

  **What to do**:
  - 新增 `ContentWatcher` 類別
  - 使用 `node:fs` 的 `watch()` API（相容 Bun）
  - 實作防抖（debounce）避免重複觸發

  ```typescript
  // packages/monolith/src/ContentWatcher.ts
  
  import { watch, type FSWatcher } from 'node:fs'
  import { join } from 'node:path'
  import type { ContentManager } from './ContentManager'
  
  interface WatcherOptions {
    debounceMs?: number // 預設 100ms
  }
  
  export class ContentWatcher {
    private watchers: FSWatcher[] = []
    private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
    
    constructor(
      private contentManager: ContentManager,
      private options: WatcherOptions = {}
    ) {}
    
    /**
     * 開始監視指定集合的檔案變更。
     */
    watch(collectionName: string): void {
      // 使用 node:fs watch
    }
    
    /**
     * 停止所有監視器。
     */
    close(): void {
      for (const watcher of this.watchers) {
        watcher.close()
      }
      this.watchers = []
    }
  }
  ```

  **Must NOT do**:
  - 不引入外部依賴（如 chokidar）
  - 不在 production 環境自動啟用

  **Parallelizable**: NO（依賴 2.1）

  **References**:

  **External References**:
  - Node.js fs.watch: https://nodejs.org/api/fs.html#fswatchfilename-options-listener
  - Bun fs compatibility: https://bun.sh/docs/runtime/nodejs-apis#node-fs
  
  **Pattern References**:
  - `packages/monolith/src/ContentManager.ts:62-64` - `defineCollection()` 存取集合配置

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/monolith/tests/content-watcher.test.ts`
  - [ ] `bun test packages/monolith/tests/content-watcher.test.ts` → PASS
  - [ ] 檔案變更後 100ms 內觸發快取失效
  - [ ] 連續快速變更只觸發一次失效（防抖）
  - [ ] `close()` 正確釋放所有資源

  **Commit**: YES
  - Message: `feat(monolith): implement ContentWatcher for hot reload`
  - Files: `packages/monolith/src/ContentWatcher.ts`, `packages/monolith/tests/content-watcher.test.ts`
  - Pre-commit: `bun test packages/monolith/tests/`

---

- [ ] 2.3 整合開發環境熱重載

  **What to do**:
  - 在 `OrbitMonolith` 類別（`packages/monolith/src/index.ts`）中整合 watcher
  - 僅在 `NODE_ENV=development` 時啟用
  - 更新匯出和文件

  ```typescript
  // packages/monolith/src/index.ts - OrbitMonolith.install() 方法內新增
  
  // 開發環境熱重載
  if (process.env.NODE_ENV === 'development') {
    const watcher = new ContentWatcher(manager)
    
    // 監視所有已註冊的集合
    if (this.config.collections) {
      for (const name of Object.keys(this.config.collections)) {
        watcher.watch(name)
      }
    }
    
    // 在 shutdown hook 中清理
    core.hooks.addAction('shutdown', () => watcher.close())
    
    core.logger.info('Content hot reload enabled 🔥')
  }
  ```

  **Must NOT do**:
  - 不在 production 環境啟用 watcher
  - 不阻塞應用程式啟動

  **Parallelizable**: NO（依賴 2.2）

  **References**:

  **Pattern References**:
  - `packages/monolith/src/index.ts:24-48` - `OrbitMonolith` 類別的 `install()` 方法（在此處整合 watcher）
  - `packages/monolith/src/index.ts:32-36` - 集合註冊邏輯（參考如何遍歷集合）
  
  **Documentation References**:
  - `packages/monolith/README.md` - 更新開發環境使用說明

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/monolith/tests/hot-reload.test.ts`
  - [ ] `bun test packages/monolith/tests/hot-reload.test.ts` → PASS
  - [ ] `NODE_ENV=development` 時 watcher 自動啟用
  - [ ] `NODE_ENV=production` 時 watcher 不啟用
  - [ ] 應用程式關閉時 watcher 正確清理

  **Manual Verification**:
  ```bash
  # 啟動開發伺服器
  NODE_ENV=development bun run examples/monolith-example/index.ts
  
  # 在另一個終端修改 content 檔案
  echo "# Updated" >> content/docs/en/test.md
  
  # 重新請求應顯示更新內容
  curl http://localhost:3000/docs/test
  ```

  **Commit**: YES
  - Message: `feat(monolith): integrate hot reload in development mode`
  - Files: `packages/monolith/src/index.ts`, `packages/monolith/README.md`
  - Pre-commit: `bun test packages/monolith/tests/`

---

### 子專案 3: RippleClient 重構與優化

---

- [ ] 3.1 強化 TypeScript 類型定義

  **What to do**:
  - 新增泛型事件類型支援
  - 實作 `EventMap` 模式（類似 ServiceMap）
  - 強化 `listen()` 方法的類型推斷

  ```typescript
  // packages/ripple-client/src/types.ts 新增
  
  /**
   * 頻道事件映射，用於類型安全的事件監聽。
   * 
   * @example
   * ```typescript
   * declare module '@gravito/ripple-client' {
   *   interface ChannelEventMap {
   *     'news': {
   *       'ArticlePublished': { title: string; author: string }
   *       'ArticleDeleted': { id: number }
   *     }
   *   }
   * }
   * 
   * client.channel('news').listen('ArticlePublished', (data) => {
   *   // data 自動推斷為 { title: string; author: string }
   * })
   * ```
   */
  export interface ChannelEventMap {
    // 由使用者透過 module augmentation 擴展
  }
  ```

  **Must NOT do**:
  - 不破壞現有 `listen<T>()` 手動泛型用法
  - 不修改運行時行為

  **Parallelizable**: YES（與 1.x, 2.x 平行）

  **References**:

  **Pattern References**:
  - `packages/core/src/Container.ts` - Task 1.1 的 ServiceMap 模式（參考）
  - `packages/ripple-client/src/types.ts:65` - 現有 `EventCallback<T>` 定義
  
  **Test References**:
  - `packages/ripple-client/tests/ripple-client.test.ts` - 現有測試模式

  **External References**:
  - Laravel Echo TypeScript: 研究結果中的 `useEcho<OrderData>` 模式

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/ripple-client/tests/types.test.ts`
  - [ ] `bun test packages/ripple-client/tests/types.test.ts` → PASS
  - [ ] `ChannelEventMap` 可被 module augmentation 擴展
  - [ ] 擴展後事件數據有正確類型推斷

  **Commit**: YES
  - Message: `feat(ripple-client): add ChannelEventMap for type-safe events`
  - Files: `packages/ripple-client/src/types.ts`, `packages/ripple-client/tests/types.test.ts`
  - Pre-commit: `bun test packages/ripple-client/tests/`

---

- [ ] 3.2 重構 Channel 類別

  **What to do**:
  - 更新 `Channel.listen()` 支援 `ChannelEventMap`
  - 新增 `.listenForWhisper()` 方法
  - 改善鏈式 API 的類型推斷

  ```typescript
  // packages/ripple-client/src/Channel.ts 更新
  
  /**
   * 類型安全的事件監聽（當 channel 和 event 在 ChannelEventMap 中）
   */
  listen<
    C extends keyof ChannelEventMap,
    E extends keyof ChannelEventMap[C]
  >(
    this: Channel & { name: C },
    event: E,
    callback: EventCallback<ChannelEventMap[C][E]>
  ): this
  
  /**
   * 手動類型的事件監聽（向後相容）
   */
  listen<T = unknown>(event: string, callback: EventCallback<T>): this
  ```

  **Must NOT do**:
  - 不修改 WebSocket 通訊邏輯
  - 不破壞現有 `.listen<T>()` 用法

  **Parallelizable**: NO（依賴 3.1）

  **References**:

  **Pattern References**:
  - `packages/ripple-client/src/Channel.ts:26-32` - 現有 `listen()` 實作
  - `packages/ripple-client/src/Channel.ts:81-89` - 現有 `whisper()` 實作

  **Acceptance Criteria**:
  - [ ] 更新測試: `packages/ripple-client/tests/channel.test.ts`
  - [ ] `bun test packages/ripple-client/tests/channel.test.ts` → PASS
  - [ ] 類型安全的 `listen()` 正確推斷數據類型
  - [ ] `listenForWhisper()` 功能正常
  - [ ] 現有用法不受影響

  **Commit**: YES
  - Message: `refactor(ripple-client): enhance Channel with type-safe listen()`
  - Files: `packages/ripple-client/src/Channel.ts`, `packages/ripple-client/tests/channel.test.ts`
  - Pre-commit: `bun test packages/ripple-client/tests/`

---

- [ ] 3.3 新增連線狀態管理

  **What to do**:
  - 新增 `ConnectionStateManager` 類別
  - 提供連線狀態變更事件
  - 整合到 `RippleClient`

  ```typescript
  // packages/ripple-client/src/ConnectionStateManager.ts
  
  export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  
  export class ConnectionStateManager {
    private state: ConnectionState = 'disconnected'
    private listeners = new Set<(state: ConnectionState, prev: ConnectionState) => void>()
    
    /**
     * 訂閱狀態變更
     */
    onStateChange(callback: (state: ConnectionState, prev: ConnectionState) => void): () => void {
      this.listeners.add(callback)
      return () => this.listeners.delete(callback)
    }
    
    /**
     * 更新狀態並通知監聽器
     */
    setState(newState: ConnectionState): void {
      const prev = this.state
      this.state = newState
      for (const listener of this.listeners) {
        listener(newState, prev)
      }
    }
  }
  ```

  **Must NOT do**:
  - 不修改現有 `getState()` 返回格式
  - 不破壞現有自動重連邏輯

  **Parallelizable**: NO（依賴 3.2）

  **References**:

  **Pattern References**:
  - `packages/ripple-client/src/RippleClient.ts:14-15` - 現有 `ConnectionState` 類型
  - `packages/ripple-client/src/RippleClient.ts:342-350` - 現有重連邏輯
  
  **Test References**:
  - `packages/ripple-client/tests/ripple-client.test.ts` - 現有測試模式

  **Acceptance Criteria**:
  - [ ] 測試檔案: `packages/ripple-client/tests/connection-state.test.ts`
  - [ ] `bun test packages/ripple-client/tests/connection-state.test.ts` → PASS
  - [ ] 狀態變更時通知所有監聽器
  - [ ] `onStateChange()` 返回取消訂閱函數
  - [ ] 整合後 `RippleClient.onStateChange()` 可用

  **Commit**: YES
  - Message: `feat(ripple-client): add ConnectionStateManager for state events`
  - Files: `packages/ripple-client/src/ConnectionStateManager.ts`, `packages/ripple-client/src/RippleClient.ts`, `packages/ripple-client/tests/connection-state.test.ts`
  - Pre-commit: `bun test packages/ripple-client/tests/`

---

- [ ] 3.4 更新 React/Vue 綁定與文件

  **What to do**:
  - 更新 React hooks 使用新的類型系統
  - 更新 Vue composables 使用新的類型系統
  - 更新 README 文件

  ```typescript
  // packages/ripple-client/src/react.tsx 更新
  
  /**
   * 類型安全的 useChannel hook
   */
  export function useChannel<
    C extends keyof ChannelEventMap,
    E extends keyof ChannelEventMap[C]
  >(
    channelName: C,
    event: E,
    options?: UseChannelOptions
  ): {
    data: ChannelEventMap[C][E] | null
    channel: Channel
  }
  
  /**
   * 使用連線狀態
   */
  export function useConnectionState(): {
    state: ConnectionState
    isConnected: boolean
    isReconnecting: boolean
  }
  ```

  **Must NOT do**:
  - 不破壞現有 hook 簽名
  - 不引入新的 React/Vue 依賴

  **Parallelizable**: NO（依賴 3.3）

  **References**:

  **External References**:
  - Laravel Echo React: 研究結果中的 `useEcho` 模式
  - Laravel Echo Vue: 研究結果中的 `useChannel` 模式
  
  **Documentation References**:
  - `packages/ripple-client/README.md:42-80` - React 使用範例
  - `packages/ripple-client/README.md:82-110` - Vue 使用範例

  **Acceptance Criteria**:
  - [ ] `bun test packages/ripple-client/tests/` → 所有測試 PASS
  - [ ] `bun tsc -p packages/ripple-client/tsconfig.json --noEmit` → PASS
  - [ ] README 更新包含新的類型安全範例
  - [ ] React/Vue 範例可正常編譯

  **Manual Verification**:
  ```bash
  # 檢查 React 範例是否可編譯
  cd examples/ripple-react-example
  bun tsc --noEmit
  
  # 檢查 Vue 範例是否可編譯
  cd examples/ripple-vue-example
  bun tsc --noEmit
  ```

  **Commit**: YES
  - Message: `feat(ripple-client): update React/Vue bindings with type-safe hooks`
  - Files: `packages/ripple-client/src/react.tsx`, `packages/ripple-client/src/vue.ts`, `packages/ripple-client/README.md`
  - Pre-commit: `bun test packages/ripple-client/tests/`

---

## Commit Strategy

| 完成任務後 | 訊息 | 檔案 | 驗證 |
|-----------|------|------|------|
| 1.1 | `feat(core): add ServiceMap interface for IoC type inference` | Container.ts, tests | `bun test packages/core/tests/service-map.test.ts` |
| 1.2 | `feat(core): implement type-safe make() overloads for ServiceMap` | Container.ts, tests | `bun test packages/core/tests/` |
| 1.3 | `docs(core): add ServiceMap usage examples to README` | index.ts, README.md | `bun tsc --noEmit` |
| 2.1 | `feat(monolith): add cache invalidation methods to ContentManager` | ContentManager.ts, tests | `bun test packages/monolith/tests/` |
| 2.2 | `feat(monolith): implement ContentWatcher for hot reload` | ContentWatcher.ts, tests | `bun test packages/monolith/tests/` |
| 2.3 | `feat(monolith): integrate hot reload in development mode` | OrbitContent.ts, README.md | `bun test packages/monolith/tests/` |
| 3.1 | `feat(ripple-client): add ChannelEventMap for type-safe events` | types.ts, tests | `bun test packages/ripple-client/tests/` |
| 3.2 | `refactor(ripple-client): enhance Channel with type-safe listen()` | Channel.ts, tests | `bun test packages/ripple-client/tests/` |
| 3.3 | `feat(ripple-client): add ConnectionStateManager for state events` | *.ts, tests | `bun test packages/ripple-client/tests/` |
| 3.4 | `feat(ripple-client): update React/Vue bindings with type-safe hooks` | react.tsx, vue.ts, README | `bun test && bun tsc --noEmit` |

---

## Success Criteria

### 驗證命令
```bash
# 完整類型檢查
turbo run typecheck --filter='./packages/core' --filter='./packages/monolith' --filter='./packages/ripple-client'

# 完整測試
turbo run test --filter='./packages/core' --filter='./packages/monolith' --filter='./packages/ripple-client'

# 預期輸出
# ✓ All type checks passed
# ✓ All tests passed
```

### 最終檢查清單
- [ ] 所有「必須包含」項目已實作
- [ ] 所有「不得包含」項目未出現
- [ ] 所有測試通過
- [ ] 所有類型檢查通過
- [ ] 文件已更新
