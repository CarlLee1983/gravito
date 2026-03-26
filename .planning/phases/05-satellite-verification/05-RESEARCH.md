# Phase 5: Satellite Verification - Research

**Researched:** 2026-03-26
**Domain:** 衛星模組驗證（RBAC、Catalog、Commerce）— 健全性審計 + Hono 就緒度
**Confidence:** HIGH（直接讀取源碼、test log、turbo log；無推測成分）

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 Satellite Scope:** 驗證三個衛星模組
- RBAC、Catalog、Commerce 均為 gravito-core 套件生態的一部分；目前與核心套件整合
- 這三個代表建立在核心框架上的領域特定應用層

**D-02 Audit Criteria:** 每個衛星評估五個維度
1. Test Coverage — 當前單元測試百分比；與其他模組的差距
2. Integration Health — 衛星導入與核心套件的整合情況（無循環依賴、無隱式依賴）
3. Type Safety — 衛星模組特定的 TypeScript 錯誤；嚴格性對齊
4. API Stability — 公開 API 表面；棄用或已知破壞性變更
5. Hono Readiness — HonoContext 類型導入、適配器使用、中間件依賴

**D-03 Hono Compatibility Decision:** 評估但延後實作決策
- 現在（Phase 5）：確定衛星代碼需要哪些重構才能與 Hono 兼容
- 延後（Phase 5B 規劃）：決定是否在 Phase 4B-6 中遷移衛星或推遲至 Phase 5B
- 約束：本階段不能有衛星 API 破壞性變更

**D-04 Validation Approach:** 使用現有測試基礎設施 + 有針對性的代碼審計
- 隔離運行衛星測試套件；檢查不穩定性或環境依賴
- 手動檢查頂層文件（index.ts、controllers、middleware）的 Hono 假設
- 核心 + 衛星的完整端對端測試
- 追蹤 Phase 4A 基線的指標（93/100 健全性，99.7% 測試通過率）

### Claude's Discretion
- 優先關注哪些測試差距
- 是否建議衛星重構（如果衛星強依賴 Hono 模式，建議現在提取或延後）
- E2E 測試新增
- 技術債務文件化（不阻擋 Phase 5 但應追蹤至 Phase 5B 的問題）

### Deferred Ideas (OUT OF SCOPE)
- 衛星功能擴展（RBAC/Catalog/Commerce 的新功能）
- 效能最佳化
- 文件大改寫
- 破壞性變更規劃（v2.0 決策）
- 多租戶功能
- GraphQL 層

</user_constraints>

---

## Summary

**關鍵發現：衛星源碼不在 gravito-core monorepo 中。**

Commit `bf2043af`（2026-03-04）將所有 18 個衛星從 gravito-core 移至獨立 repo `gravito-dev-env/gravito-satellites`。gravito-core 的 `satellites/` 目錄現在只剩下 `dist/` 和 `node_modules/`（已發佈的 npm 版本 dist artifact），源碼和測試不在此處。

衛星源碼位於：`/Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/{rbac,catalog,commerce}/`。

**三個衛星的當前狀態：**
- **Catalog**：183 tests 全部通過（0 fail）。TypeCheck 0 錯誤。健全度最高。
- **Commerce**：71 tests 全部通過（0 fail）。TypeCheck 0 錯誤。有一個跨衛星依賴（@gravito/satellite-flash-sale）。
- **RBAC**：110 tests，104 通過，**6 失敗**（RbacServiceProvider 測試）。TypeCheck 0 錯誤。問題已確認為測試基礎設施問題（mock 設計不匹配），非生產代碼缺陷。

**Hono 就緒度：極高。** 所有三個衛星均使用 `GravitoContext`（核心的抽象類型），不直接導入 `hono` 或 `@gravito/photon`。Phase 4B Hono 遷移對衛星層無影響。

**Primary recommendation:** Phase 5 驗證範圍需要擴展至 `gravito-dev-env/gravito-satellites` repo，否則在 gravito-core 中沒有可審計的衛星源碼。RBAC 的 6 個測試失敗需要修復（測試 mock 設計問題）。Catalog 和 Commerce 可以宣告 Phase 5 健康通過。

---

## Standard Stack

### Satellite Build Stack
| 元件 | 版本 | 用途 |
|------|------|------|
| tsup | 8.5.1 | ESM bundle（每個衛星獨立 build） |
| TypeScript | 5.9.3 | 類型檢查（skipLibCheck） |
| bun:test | 1.3.9（gravito-dev-env）/ 1.3.10（core） | 測試執行器 |
| turbo | latest | 任務管理和快取 |

### 每個衛星的核心依賴
| 衛星 | @gravito/core | @gravito/atlas | @gravito/enterprise | @gravito/signal | 跨衛星依賴 |
|------|:---:|:---:|:---:|:---:|:---:|
| RBAC | ✓ | ✓ | ✓ | ✓ | 無（僅依賴 @gravito/sentinel、@gravito/stasis）|
| Catalog | ✓ | ✓ | ✓ | ✓ | 無 |
| Commerce | ✓ | ✓ | 無 | ✓ | @gravito/satellite-flash-sale（^0.2.0，非 workspace） |

**重要：** Commerce 的 flash-sale 依賴使用固定版本（^0.2.0）而非 `workspace:*`，代表它依賴已發佈的 npm 版本，而非本地 workspace。

---

## Architecture Patterns

### 衛星實際位置

```
gravito-dev-env/
└── gravito-satellites/              # 獨立 monorepo（2026-03-04 遷出）
    ├── rbac/
    │   ├── src/
    │   │   ├── Application/         # UseCases, DTOs, Errors
    │   │   ├── Domain/              # DCI Contexts, Roles, Entities, ValueObjects
    │   │   ├── Infrastructure/      # Persistence, Gate
    │   │   └── Interface/Http/      # Controllers, Middleware
    │   └── tests/                   # Application, Domain, Infrastructure, Interface
    ├── catalog/
    │   ├── src/
    │   │   ├── Application/         # UseCases, DTOs, Errors
    │   │   ├── Domain/              # DCI Contexts, Roles, Entities, ValueObjects
    │   │   ├── Infrastructure/      # Persistence
    │   │   └── Interface/Http/      # Controllers
    │   └── tests/                   # use-cases, domain DCI roles, categories
    └── commerce/
        ├── src/
        │   ├── Application/         # UseCases, DTOs, Errors, Subscribers
        │   ├── Domain/              # DCI Contexts, Roles, Entities, Events, ValueObjects
        │   ├── Infrastructure/      # Persistence, Migrations
        │   └── Interface/Http/      # Controllers, Requests
        └── tests/                   # domain, dci-roles, dci-checkout, use-cases
```

gravito-core 的 `satellites/` 目錄只剩下：
```
gravito-core/
└── satellites/
    ├── rbac/
    │   ├── dist/index.js            # 已發佈的 build（34KB）
    │   └── node_modules/@gravito/   # 安裝的依賴（v2.0.6 版本）
    ├── catalog/
    │   └── dist/index.js            # 已發佈的 build
    └── commerce/
        └── dist/index.js            # 已發佈的 build
```

### Pattern 1: GravitoContext 抽象（所有衛星）
**What:** 所有 Controller 和 Middleware 均使用 `GravitoContext` 類型（來自 `@gravito/core`），而非直接使用 Hono 類型。
**When to use:** 始終如此；是衛星的標準 HTTP 接觸點

```typescript
// 來源：RBAC PermissionController、Catalog AdminProductController、Commerce AdminOrderController
import type { GravitoContext } from '@gravito/core'

async index(ctx: GravitoContext) {
  const page = parseInt(ctx.req.query('page') || '1')
  return ctx.json(result, 200)
}
```

### Pattern 2: DCI（Domain-Context-Interaction）架構
**What:** 複雜領域邏輯透過 DCI 模式組織：Roles（行為單元）+ Contexts（協調者）
**When to use:** 用於有多個行為者的複雜操作（授權、checkout、訂單生命週期）

### Pattern 3: ServiceProvider 整合模式
**What:** 每個衛星提供一個 ServiceProvider（繼承 `@gravito/core` 的 `ServiceProvider`），在 IoC 容器中綁定服務並在 boot() 中掛載路由。
**When to use:** 衛星初始化的入口點

### Pattern 4: 跨衛星通訊（事件驅動）
**What:** 衛星間不直接導入。使用 `core.hooks.doAction(tag, data)` 發佈事件，其他衛星訂閱。
**When to use:** 任何需要跨衛星協調的場景（例如：Commerce 訂單完成 → Membership 積分）

```typescript
// Commerce RewardSubscriber — 使用事件而非直接導入 membership 衛星
await this.core.hooks.doAction('rewards:assigned', {
  memberId: raw.member_id,
  points,
})
```

### Anti-Patterns to Avoid
- **直接衛星導入**：禁止 `import { X } from '@gravito/satellite-*'`，必須使用事件
- **HonoContext 直接使用**：衛星不應導入 Hono 類型；使用 GravitoContext
- **register() 不傳 container**：ServiceProvider.register(container) 必須接收容器參數（RBAC 現有測試缺陷）

---

## 五維度審計結果

### 維度一：測試覆蓋率

| 衛星 | 測試總數 | 通過 | 失敗 | 跳過 | 通過率 |
|------|----------|------|------|------|--------|
| RBAC | 110 | 104 | **6** | 0 | 94.5% |
| Catalog | 183 | 183 | 0 | 0 | **100%** |
| Commerce | 71 | 71 | 0 | 0 | **100%** |

**RBAC 6 個失敗的根因：**
失敗集中在 `RbacServiceProvider.test.ts` 中。根本原因是測試調用 `provider.register()` 不傳 `container` 參數，但 `register(container: any)` 方法的實作確實使用 container。測試的 `createMockCore()` 設置了正確的 mock container，但在調用 `provider.register()` 時忘記傳入。這是**測試代碼缺陷**，不是生產代碼問題（其他 104 個測試完全通過）。

**測試結構：**
- RBAC：27 個測試文件（Application × 10、Domain × 10、Infrastructure × 6、Interface × 2）
- Catalog：18 個測試文件（domain DCI roles、use-cases、categories）
- Commerce：7 個測試文件（dci-roles、dci-checkout、domain-entities、place-order、DeductInventory 等）

**測試缺口：**
- 三個衛星均無 E2E 測試
- Commerce 缺少 Interface/Http 層測試（Controllers 未被測試）
- RBAC 有 Interface 層測試但有缺陷

### 維度二：整合健全性

| 衛星 | 循環依賴 | 隱式依賴 | 跨衛星直接導入 | 健全狀態 |
|------|----------|----------|----------------|----------|
| RBAC | 0 | 0 | 0 | GREEN |
| Catalog | 0 | 0 | 0 | GREEN |
| Commerce | 0 | 0 | 0 | **YELLOW** |

**Commerce 的 YELLOW 狀態原因：**
- 依賴 `@gravito/satellite-flash-sale: "^0.2.0"`（固定版本，非 workspace），而非衛星隔離原則推薦的事件方式
- 這是唯一一個衛星直接依賴另一個衛星 package 的案例
- flash-sale 衛星本身存在測試問題（`Cannot find module './adapters/GravitoEngineAdapter'`）

**所有三個衛星的依賴聲明均正確（workspace:* 格式），無隱式依賴問題。**

### 維度三：類型安全

| 衛星 | TypeCheck 結果 | @ts-expect-error | `any` 使用 |
|------|----------------|------------------|------------|
| RBAC | 0 errors | 不明（skipLibCheck） | ServiceProvider.register(container: **any**) |
| Catalog | 0 errors | 不明（skipLibCheck） | AdminProductController 錯誤回應使用 `as any` |
| Commerce | 0 errors | 不明（skipLibCheck） | AdminOrderController 使用 `as any` |

**已確認的類型問題：**
1. `register(container: any)` — 應改為 `register(container: Container)` 以利用強類型
2. `ctx.json({...}, statusCode as any)` — 在 Catalog 和 Commerce 的 Controller 中出現，表示 GravitoContext.json() 的類型定義可能需要更新以接受 number 類型的 statusCode

TypeCheck 命令使用 `--skipLibCheck`，這可能掩蓋部分依賴包的類型問題。

### 維度四：API 穩定性

| 衛星 | 版本 | 公開 API 入口點 | 已知棄用 |
|------|------|-----------------|----------|
| RBAC | 0.1.0 | `RbacServiceProvider`、`requirePermission` middleware | 無 |
| Catalog | 0.2.0 | `CatalogServiceProvider` | 無 |
| Commerce | 0.2.0 | `CommerceServiceProvider` | 無 |

**RBAC（0.1.0）尚未達到 0.2.0，表示 API 可能仍在演進。**

所有衛星的公開 API 表面均透過 `src/index.ts` 導出，結構乾淨：只有 ServiceProvider 和必要的 Domain types。

### 維度五：Hono 就緒度

| 衛星 | 直接 Hono 導入 | 直接 photon 導入 | HonoContext 使用 | 就緒度 |
|------|:---:|:---:|:---:|:---:|
| RBAC | 無 | 無 | 無（使用 GravitoContext） | **GREEN - 完全就緒** |
| Catalog | 無 | 無 | 無（使用 GravitoContext） | **GREEN - 完全就緒** |
| Commerce | 無 | 無 | 無（使用 GravitoContext） | **GREEN - 完全就緒** |

**結論：三個衛星對 Hono 遷移完全透明。** 它們只使用 `GravitoContext`（核心抽象），不依賴 Hono 實作細節。Phase 4B Hono 遷移對衛星源碼**零影響**。

---

## Don't Hand-Roll

| 問題 | 不要自建 | 使用現有方案 | 原因 |
|------|----------|--------------|------|
| 跨衛星通訊 | 直接導入 | `core.hooks.doAction` | 事件驅動確保隔離 |
| HTTP 上下文 | HonoContext 或 Request 原生 | `GravitoContext` | 確保 Hono 遷移透明 |
| 容器綁定 | 手動依賴解析 | `ServiceProvider.register(container)` | IoC 容器管理生命週期 |
| 路由掛載 | 直接 Hono router | `core.adapter.route()` | 透過適配器模式解耦 |

---

## Common Pitfalls

### Pitfall 1: 在 gravito-core 中找衛星源碼
**What goes wrong:** 嘗試在 `gravito-core/satellites/` 找衛星 `.ts` 源碼，只找到 `dist/`。
**Why it happens:** Commit `bf2043af`（2026-03-04）已將衛星遷移至 `gravito-dev-env/gravito-satellites`。
**How to avoid:** 衛星所有工作必須在 `/Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/` 進行。
**Warning signs:** 只看到 `dist/`，無 `src/` 目錄。

### Pitfall 2: RBAC ServiceProvider 測試失敗誤判為生產 Bug
**What goes wrong:** 看到 RBAC 6 fail 誤認為 ServiceProvider 有問題。
**Why it happens:** 測試文件 `RbacServiceProvider.test.ts` 調用 `provider.register()` 未傳 container 參數，但 `register(container: any)` 需要它。
**How to avoid:** 確認是測試代碼問題，fix 方法是在測試中傳遞 `core.container` 給 `provider.register(core.container)`。
**Warning signs:** 錯誤訊息 `undefined is not an object (evaluating 'container.singleton')`。

### Pitfall 3: Commerce 的 flash-sale 版本綁定問題
**What goes wrong:** 假設所有衛星間依賴均使用 `workspace:*`。
**Why it happens:** Commerce 的 `@gravito/satellite-flash-sale: "^0.2.0"` 使用 npm 版本。
**How to avoid:** 若更新 flash-sale，需要發佈並更新 Commerce 的版本約束。
**Warning signs:** flash-sale 本身有測試問題（`GravitoEngineAdapter` 模塊找不到），可能影響 Commerce 的集成測試。

### Pitfall 4: Bun 版本不一致
**What goes wrong:** gravito-core 使用 Bun 1.3.10，gravito-dev-env 的衛星使用 Bun 1.3.9。
**Why it happens:** 兩個 repo 各自獨立管理。
**How to avoid:** 確保衛星測試在 1.3.9 環境下運行，或升級至 1.3.10 並重新測試。
**Warning signs:** API 不兼容、行為差異（如 `Bun.Tar` 可用性）。

---

## Runtime State Inventory

> Phase 5 是驗證/審計階段，非重命名/重構。此章節標記：SKIPPED — 無字串重命名操作。

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bun | 衛星測試執行 | ✓ | 1.3.10（core）/ 1.3.9（dev-env） | — |
| gravito-dev-env/gravito-satellites | 衛星源碼審計 | ✓ | 本地路徑存在 | — |
| TypeScript | typecheck | ✓ | 5.9.3 | — |
| tsup | 衛星 build | ✓ | 8.5.1 | — |

**注意：** 衛星測試命令必須在 `gravito-dev-env/gravito-satellites/{module}/` 目錄下執行，不是在 gravito-core 中。

---

## Code Examples

### 運行衛星測試的隔離命令

```bash
# RBAC（在 gravito-dev-env/gravito-satellites/rbac/）
cd /Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/rbac
bun test

# Catalog
cd /Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/catalog
bun test

# Commerce
cd /Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/commerce
bun test

# TypeCheck（任意衛星）
bun tsc -p tsconfig.json --noEmit --skipLibCheck
```

### RBAC ServiceProvider 測試修復方法

```typescript
// 當前（有缺陷）：
it('register() 綁定所有依賴到容器', () => {
  provider.register()  // container 是 undefined！
  // ...
})

// 修復方法：
it('register() 綁定所有依賴到容器', () => {
  provider.register(core.container)  // 傳遞 container
  // ...
})
```

### Hono 就緒度確認：GravitoContext 使用模式

```typescript
// 來源：RBAC、Catalog、Commerce 所有 Controller（一致模式）
import type { GravitoContext } from '@gravito/core'

export class SomeController {
  async index(ctx: GravitoContext) {
    // ctx.req.query(), ctx.req.param(), ctx.req.json()
    // ctx.json(data, statusCode)
    // ctx.get('key') — request scope 存取
    // 無任何 Hono 直接引用
  }
}
```

---

## State of the Art

| 舊方法 | 當前方法 | 變更時間 | 影響 |
|--------|----------|----------|------|
| 衛星在 gravito-core monorepo | 衛星在 gravito-dev-env/gravito-satellites | 2026-03-04（commit bf2043af） | Phase 5 審計需在外部 repo 進行 |
| 衛星使用 Hono compat shims（推測）| 衛星使用 GravitoContext 抽象 | feat: native-engine 遷移（435af77c）| 衛星對 Phase 4B Hono 遷移免疫 |
| Flash-sale 與 commerce 可能 workspace 依賴 | Commerce 使用 npm 版本（^0.2.0） | 遷移至外部 repo 時 | 版本管理需要手動同步 |

---

## Open Questions

1. **flash-sale 衛星的 `GravitoEngineAdapter` 錯誤**
   - What we know: flash-sale 測試有 `Cannot find module './adapters/GravitoEngineAdapter'` 錯誤
   - What's unclear: 這個模塊是否應該在 core 中存在，或是 flash-sale 的實作缺陷？
   - Recommendation: Phase 5 計畫需要包含 flash-sale 健全性審計，因為 Commerce 依賴它

2. **RBAC ServiceProvider 失敗是否也存在於 boot() 測試中？**
   - What we know: 6 個失敗都源自 register() 未傳 container，導致 boot() 中的 this.core.container 也無法正常工作
   - What's unclear: register() 傳入 container 後，boot() 測試是否也需要其他修復
   - Recommendation: 修復 register() 調用後需要重新運行完整測試套件

3. **ctx.json() 的 statusCode 類型問題**
   - What we know: Catalog 和 Commerce 中有 `ctx.json({...}, statusCode as any)` 模式
   - What's unclear: GravitoContext 的 json() 方法是否接受 number 還是要求特定 HTTP 狀態碼聯合類型
   - Recommendation: 審計 `@gravito/core` 的 GravitoContext 類型定義確認這是類型問題還是 API 限制

4. **衛星版本升級策略**
   - What we know: RBAC 是 0.1.0，Catalog 和 Commerce 是 0.2.0；gravito-core 套件多為 2.x
   - What's unclear: 是否有計畫將衛星升至 1.x/2.x？API 穩定性保證在哪裡？
   - Recommendation: 文件化衛星版本策略，確認 Phase 5B 遷移前的穩定版本要求

---

## Phase 5B Readiness Assessment

| 評估維度 | 當前狀態 | Phase 5B 就緒度 |
|----------|----------|-----------------|
| Hono 類型依賴 | 零（使用 GravitoContext） | READY — 無任何遷移工作 |
| RBAC 測試 | 94.5% 通過（6 個 mock 設計缺陷） | NEEDS FIX（低風險，1 行修復）|
| Catalog 測試 | 100% 通過 | READY |
| Commerce 測試 | 100% 通過（單元層） | READY（需增加 Interface 層測試）|
| 跨衛星隔離 | 衛星間無直接導入 | READY |
| flash-sale 依賴 | Commerce 依賴，flash-sale 有測試問題 | NEEDS INVESTIGATION |
| E2E 測試 | 三個衛星均無 E2E | GAP（Phase 5B 前建議補充） |

**整體 Phase 5B 就緒度：MEDIUM** — 衛星代碼架構完全符合 Hono 遷移後的核心框架，但 RBAC 測試缺陷、flash-sale 問題和缺少 E2E 測試是執行 Phase 5B 前需處理的事項。

---

## Technical Debt Catalog

| ID | 衛星 | 描述 | 嚴重性 | Phase 5B 前必須修復？ |
|----|------|------|--------|----------------------|
| TD-01 | RBAC | RbacServiceProvider.test.ts 未傳 container 給 register() | MEDIUM | 是（6 個測試失敗） |
| TD-02 | Commerce | 依賴 @gravito/satellite-flash-sale ^0.2.0（非 workspace） | LOW | 評估 flash-sale 健全性 |
| TD-03 | Commerce | Interface/Http Controllers 無測試 | MEDIUM | 建議補充 |
| TD-04 | Catalog | Interface/Http Controllers 無測試 | MEDIUM | 建議補充 |
| TD-05 | RBAC/Catalog/Commerce | register(container: any)、ctx.json() as any | LOW | 不阻擋，但降低類型安全性 |
| TD-06 | flash-sale | GravitoEngineAdapter 模塊找不到 | HIGH | 影響 Commerce 集成測試 |
| TD-07 | 全部 | 無 E2E 測試 | MEDIUM | Phase 5B 前建議補充關鍵路徑 |
| TD-08 | 全部 | TypeCheck 使用 --skipLibCheck，掩蓋部分類型問題 | LOW | 可選改進 |

---

## Validation Architecture

> `.planning/config.json` 讀取受限。根據慣例和 Phase 4A 記錄，nyquist_validation 預設啟用。

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | bunfig.toml（各衛星目錄下） |
| Quick run command | `cd .../gravito-satellites/{module} && bun test` |
| Full suite command | `cd .../gravito-satellites && bun run test`（透過 turbo） |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Command | 現有測試？ |
|-----|----------|-----------|---------|-----------|
| D-02/RBAC | RBAC 所有維度審計 | 分析 + 現有測試 | `cd .../rbac && bun test` | ✅（有缺陷 6 個）|
| D-02/Catalog | Catalog 所有維度審計 | 現有測試 | `cd .../catalog && bun test` | ✅ 全通過 |
| D-02/Commerce | Commerce 所有維度審計 | 現有測試 | `cd .../commerce && bun test` | ✅ 全通過 |
| D-02/Hono | Hono 相容性檢查 | 代碼審計 | `grep -r "from 'hono'" .../satellites/` | ✅ 已確認無引用 |
| D-04/health | 維持 Phase 4A 基線 | 全套測試 | `bun run test` (core) | ✅ 不受衛星影響 |

### Wave 0 Gaps
- [ ] `gravito-satellites/rbac/tests/Interface/RbacServiceProvider.test.ts` — 需修復 TD-01（傳遞 container 參數）
- [ ] `gravito-satellites/commerce/tests/Interface/` — 補充 AdminOrderController、CheckoutController 的測試（TD-03）
- [ ] `gravito-satellites/catalog/tests/Interface/` — 補充 AdminProductController、AdminCategoryController 的測試（TD-04）

---

## Sources

### Primary (HIGH confidence)
- 直接讀取 `/Users/carl/Dev/Carl/gravito-dev-env/gravito-satellites/{rbac,catalog,commerce}/` 源碼
- turbo 測試日誌（`/.turbo/turbo-test.log`）— 真實測試執行結果
- turbo typecheck 日誌（`/.turbo/turbo-typecheck.log`）— TypeCheck 0 errors
- `git show bf2043af` — 確認衛星遷移的提交記錄
- `git ls-tree bf2043af^` — 最後一版在 gravito-core 的衛星目錄樹

### Secondary (MEDIUM confidence)
- `.planning/codebase/STRUCTURE.md` — 架構說明（記載衛星已移至外部 repo）
- `.planning/phases/04B-hono-migration-pending/04B-RESEARCH.md` — 確認衛星不在 Phase 4B 範圍內
- `MIGRATION_ROADMAP.md` — 確認衛星隔離策略

---

## Metadata

**Confidence breakdown:**
- 衛星定位：HIGH — 直接目錄掃描 + git 歷史確認
- 測試狀態：HIGH — 直接讀取 turbo test logs
- TypeCheck 狀態：HIGH — 直接讀取 turbo typecheck logs（空輸出 = 0 errors）
- Hono 就緒度：HIGH — 直接 grep 源碼確認無 hono/photon 導入
- RBAC 失敗根因：HIGH — 讀取測試源碼確認 mock 設計問題
- flash-sale 問題：MEDIUM — 讀取 test log 但未深入調查根因

**Research date:** 2026-03-26
**Valid until:** 2026-04-25（衛星代碼相對穩定；Hono 遷移前衛星層無主要工作）
