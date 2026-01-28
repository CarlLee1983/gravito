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
- [x] `bun test` 所有受影響套件測試通過
- [x] `bun tsc -p tsconfig.json --noEmit` 類型檢查通過
- [x] 文件更新反映新 API

### 必須包含
- [x] 完整的 TypeScript 類型支援
- [x] 向後相容性（不破壞現有 API）
- [x] 開發/生產環境區分（熱重載僅在 development）

### 不得包含（防護欄）
- [x] 不修改核心 Container 解析邏輯
- [x] 不新增外部依賴（watch 功能使用 Node.js/Bun 原生）
- [x] 不變更 Ripple 通訊協議
- [x] 不實作 encrypted channels（超出範圍）
- [x] 不新增測試以外的程式碼覆蓋工具

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

- [x] 1.1 定義 ServiceMap 介面與類型基礎
- [x] 1.2 實作類型安全的 make() 重載
- [x] 1.3 更新文件與匯出

---

### 子專案 2: Monolith ContentManager 熱重載

---

- [x] 2.1 新增快取清除方法
- [x] 2.2 實作檔案監視器
- [x] 2.3 整合開發環境熱重載

---

### 子專案 3: RippleClient 重構與優化

---

- [x] 3.1 強化 TypeScript 類型定義
- [x] 3.2 重構 Channel 類別
- [x] 3.3 新增連線狀態管理
- [x] 3.4 更新 React/Vue 綁定與文件


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
