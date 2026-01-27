# Phase 3: Performance & Stability 執行計畫

## Context

### 原始需求
Gravito Core 改進路線圖的第三階段，專注於系統的健壯性與未來擴展：
1. **Core Circular Dependency Detection** - 在 IoC 容器中實作循環依賴檢測。
2. **Ripple Rate Limiting** - 實作 WebSocket `whisper` 事件的頻率限制。
3. **Monolith Git Backend Research** - 研究並記錄如何實作 Git 型態的內容後端。

---

## 工作目標

### 核心目標
提升核心框架在複雜場景下的穩定性，防止無窮遞迴與惡意請求，並為 Monolith 的遠端化鋪路。

### 具體交付物
1. `packages/core/src/Container.ts` - 新增解析堆疊監控。
2. `packages/core/src/exceptions/CircularDependencyException.ts` - 新的例外類型。
3. `packages/ripple/src/utils/RateLimiter.ts` - 頻率限制輔助類別。
4. `packages/ripple/src/RippleServer.ts` - 整合 Rate Limiting。
5. `docs/research/monolith-git-backend.md` - 技術研究文件。

### 完成定義
- [ ] Container 解析循環依賴時拋出例外。
- [ ] `whisper` 請求超過限制時返回錯誤。
- [ ] 研究文件詳述了 API 整合方案與所需的介面變動。

---

## 驗證策略

### 測試決策
- **基礎設施存在**: YES (`bun test`)
- **需要測試**: YES (TDD for Core, Ripple)
- **框架**: `bun test`

---

## TODOs

### Sub-project 1: Core Circular Dependency Detection

- [ ] 1.1 建立 `CircularDependencyException`
  - **File**: `packages/core/src/exceptions/CircularDependencyException.ts`
  - **Action**: 建立一個繼承自 `Error` 的類別，記錄產生循環的鍵名路徑。

- [ ] 1.2 在 `Container.make()` 實作堆疊追蹤
  - **File**: `packages/core/src/Container.ts`
  - **Action**: 
    - 新增 `private resolutionStack = new Set<BindingKey>()`。
    - 在 `make` 開始時檢查 key 是否在 stack 中，若是則拋出例外。
    - 若不在，則 `add` 到 stack，解析完成後 `delete`。

### Sub-project 2: Ripple Rate Limiting

- [ ] 2.1 實作 `TokenBucket` 限流器
  - **File**: `packages/ripple/src/utils/TokenBucket.ts`
  - **Action**: 實作一個簡單的令牌桶算法類別。

- [ ] 2.2 在 `RippleServer` 整合限流
  - **File**: `packages/ripple/src/RippleServer.ts`, `packages/ripple/src/types.ts`
  - **Action**: 
    - 更新 `RippleConfig` 加入 `rateLimit` 配置（如 `whisper: { max: 10, interval: '1s' }`）。
    - 在 `handleWhisper` 中檢查 client 是否超過頻率。

### Sub-project 3: Monolith Git Backend Research

- [ ] 3.1 撰寫技術研究文件
  - **File**: `docs/research/monolith-git-backend.md`
  - **Action**: 
    - 分析 GitHub/GitLab Content API。
    - 比較 API Fetch vs Git Sparse Checkout。
    - 提議 `ContentManager` 的 `ContentDriver` 介面重構方案。

---

## Success Criteria
- IoC 容器不再因為 A -> B -> A 的綁定導致 Stack Overflow。
- 單個 WebSocket client 無法透過大量 whisper 訊息癱瘓伺服器。
- 具備可執行的 Monolith 遠端化路徑圖。
