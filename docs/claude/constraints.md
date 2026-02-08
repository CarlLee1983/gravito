# Monorepo 約束與規範

> **用途**：Monorepo 4 大約束、隔離規則、檢查工具、強制性要求
> **何時查閱**：設計新包、修改依賴、檢查合規性時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 4 大核心約束（必須遵守）

### 約束 1：包邊界清晰

**要求**：只透過 `index.ts` 暴露公開 API，內部目錄禁止直接導入

#### 正確的包結構

```
packages/core/
  ├── src/
  │   ├── application.ts
  │   ├── hooks/
  │   │   └── HookManager.ts
  │   ├── container/
  │   │   └── Container.ts
  │   ├── events/
  │   │   └── EventBus.ts
  │   └── index.ts （唯一的公開接口）
  ├── tests/
  ├── package.json
  └── tsconfig.json

satellites/catalog/
  ├── src/
  │   ├── models/
  │   │   └── Product.ts
  │   ├── use-cases/
  │   │   └── CreateProduct.ts
  │   ├── repositories/
  │   │   └── ProductRepository.ts
  │   ├── events/
  │   │   └── ProductCreatedEvent.ts
  │   └── index.ts （唯一的公開接口）
  ├── tests/
  ├── package.json
  └── tsconfig.json
```

#### 違反例 vs 正確例

```typescript
// ❌ WRONG - 直接導入內部路徑
import { HookManager } from '@gravito/core/container/HookManager'
import { EventBus } from '@gravito/core/events/EventBus'
import { ProductRepository } from '@gravito/satellite-catalog/repositories/ProductRepository'

// ✅ CORRECT - 透過 index.ts 導出的公開 API
import { HookManager, EventBus } from '@gravito/core'
import { ProductRepository } from '@gravito/satellite-catalog'
```

#### 檢查方式

```bash
# Biome 會強制執行此規則
bun run check

# 手動檢查：搜索所有內部路徑導入
grep -r "from '@gravito/\w\+/\w\+" packages/ satellites/
# 如果有結果，說明違反了邊界原則
```

---

### 約束 2：包版本一致性

**要求**：所有 `@gravito/*` 包保持相同版本號（語義化版本）

#### 版本同步原則

```
✅ 合法
@gravito/core@1.2.3
@gravito/photon@1.2.3
@gravito/atlas@1.2.3
@gravito/signal@1.2.3
@gravito/stream@1.2.3
... 所有包都是 1.2.3

❌ 違反
@gravito/core@1.2.3
@gravito/photon@1.2.4       ← 版本不一致
@gravito/atlas@1.2.3
```

#### 為什麼需要版本一致？

| 原因 | 後果 |
|---|---|
| 簡化用戶依賴 | 用戶只需指定 `@gravito/*@^1.2.0`，無需逐包指定 |
| 防止不相容 | 同版本號保證 API 一致性，不同版本無法互操作 |
| 統一發佈 | Changeset 一次性更新所有包版本 |
| 清晰溝通 | 文檔和公告只需一個版本號 |

#### 檢查方式

```bash
# 檢查所有包版本一致性
bun run version:check

# 輸出示例（成功）
✅ All packages have consistent versions: 1.2.3

# 輸出示例（失敗）
❌ Version mismatch found:
   @gravito/core@1.2.3
   @gravito/photon@1.2.4  ← 需修正
```

#### 版本號策略（語義化版本）

| 版本類型 | 示例 | 何時使用 |
|---|---|---|
| **Major** | 1.0.0 → 2.0.0 | 破壞性 API 更改（不向後相容） |
| **Minor** | 1.0.0 → 1.1.0 | 新功能（向後相容） |
| **Patch** | 1.0.0 → 1.0.1 | 錯誤修復 |

#### Changeset 發佈流程

```bash
# 修改代碼後，創建 changeset
bun run changeset

# 選項說明：
# - 選擇受影響的包（使用空格選擇，Enter 確認）
# - 選擇版本級別（major / minor / patch）
# - 輸入變更說明

# Changeset 文件示例
.changeset/
  amazing-cats-123.md:
    ---
    "@gravito/core": minor
    "@gravito/photon": minor
    "@gravito/atlas": patch
    "@gravito/signal": minor
    "@gravito/stream": patch
    ---

    - Add new hook lifecycle management
    - Improve error handling in HTTP layer
    - Fix N+1 query in ORM
```

---

### 約束 3：禁止循環依賴

**要求**：包之間的依賴必須形成有向無環圖（DAG），禁止循環

#### 違反例 vs 正確例

```
❌ 禁止 - 循環依賴
A → B
B → C
C → A  ← 回到 A，形成循環

❌ 禁止 - 相互依賴
A → B
B → A

✅ 允許 - 單向依賴
A → B
B → C
C → (無依賴)

✅ 允許 - 透過事件總線解耦
A → Event Bus ← B
(A 和 B 不直接依賴，透過事件通訊)
```

#### 循環依賴的後果

| 後果 | 嚴重性 |
|---|---|
| Pre-push hook 失敗 | 🔴 CRITICAL - 無法推送代碼 |
| CI 構建中止 | 🔴 CRITICAL - 無法合併 PR |
| 模組加載順序不確定 | 🔴 CRITICAL - 運行時崩潰 |
| 難以測試 | 🟡 HIGH - 無法獨立測試 |
| 難以部署 | 🟡 HIGH - 衛星無法獨立部署 |

#### 檢查工具

```bash
# 生成依賴圖，視覺化檢查
bun run scripts/generate-dependency-graph.ts

# 輸出示例
gravito-dependency-graph.html  ← 在瀏覽器中打開

# 本地驗證受影響包
bun run scripts/validate-affected-packages.ts

# Pre-push hook 會自動執行此檢查
```

#### 解決循環依賴

**方案 1：提取公共模組**

```
原來的循環：
A → B → A

解決方案：
A → Shared ← B
(將共用代碼提取到新包)
```

**方案 2：使用事件總線（推薦）**

```
原來的直接調用：
OrderService (satellite-commerce)
  → InventoryService (satellite-inventory)  ← 循環風險

使用事件解耦：
OrderService 發佈 OrderCreatedEvent
EventBus
InventoryService 監聽 OrderCreatedEvent

優點：
- ✅ 完全解耦
- ✅ 衛星獨立
- ✅ 易於測試
```

**方案 3：重新評估包邊界**

```
如果循環無法避免，考慮：
- 是否需要拆分包？
- 是否包職責重疊？
- 是否應合併為一個包？
```

---

### 約束 4：TypeScript 嚴格模式

**要求**：所有包啟用 4 個嚴格檢查選項

#### 必須開啟的編譯選項

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,           // 禁止未使用的局部變數
    "noUnusedParameters": true,       // 禁止未使用的參數
    "noImplicitReturns": true,        // 要求顯式 return
    "noFallthroughCasesInSwitch": true // switch 必須 break
  }
}
```

#### 每個選項的意義

| 選項 | 違反示例 | 修復方式 | 目的 |
|---|---|---|---|
| `noUnusedLocals` | `const x = 5; console.log(1)` | 刪除 `x` 或使用它 | 檢測死代碼 |
| `noUnusedParameters` | `function foo(a, b) { return a }` | 刪除 `b` 或使用它 | 清理函數簽名 |
| `noImplicitReturns` | `function test() { if (x) return 1 }` | 添加最後的 `return` | 防止隱含 undefined |
| `noFallthroughCasesInSwitch` | `case 1: x++; case 2: x++` | 在 case 1 後添加 `break` | 防止邏輯錯誤 |

#### 檢查方式

```bash
# TypeScript 類型檢查會強制執行
bun run typecheck

# 快速檢查（使用 Turbo 快取）
bun run typecheck

# 完整檢查（清除快取，強制執行）
bun run typecheck:full

# 檢查特定包
cd packages/<name>
bun run typecheck
```

#### 為什麼這些檢查重要？

在 Monorepo 中，未使用變數可能導致：

```typescript
// ❌ 問題：atlas 包中有未使用的導入
import { EventBus } from '@gravito/signal'

// core 升級時移除了 EventBus
// ↓
// atlas 報編譯錯誤
// ↓
// 所有依賴 atlas 的衛星都無法構建

// ✅ 解決：不保留未使用的代碼
// TypeScript 會在編譯時檢查，防止這個問題
```

---

## Satellite 隔離規則

### 隔離原則

#### 規則 1：Satellite 間禁止直接導入

```typescript
// ❌ WRONG
// satellite-commerce/src/index.ts
import { InventoryService } from '@gravito/satellite-inventory'

export class OrderService {
  async createOrder(productId: string) {
    // 直接調用其他衛星
    await InventoryService.deduct(productId)
  }
}

// ✅ CORRECT
// satellite-commerce/src/index.ts
import { signal } from '@gravito/signal'
import { OrderCreatedEvent } from './events/OrderCreatedEvent'

export class OrderService {
  async createOrder(productId: string) {
    // 發佈事件
    await signal.emit(new OrderCreatedEvent(productId))
  }
}

// satellite-inventory/src/index.ts（在 bootstrap 時）
signal.on(OrderCreatedEvent, async (event) => {
  await InventoryService.deduct(event.productId)
})
```

#### 規則 2：跨衛星通訊必須透過事件

```typescript
// ❌ WRONG - RPC 呼叫
const result = await catalogService.getProduct(productId)

// ✅ CORRECT - 事件驅動
signal.emit(new GetProductEvent(productId))
signal.on(ProductRetrievedEvent, (event) => {
  // 處理結果
})
```

#### 規則 3：依賴應聲明在 package.json

```json
{
  "dependencies": {
    "@gravito/core": "workspace:*",
    "@gravito/atlas": "workspace:*",
    "@gravito/signal": "workspace:*"
  }
  // ❌ 不應在這裡依賴其他衛星
  // ❌ "@gravito/satellite-inventory": "workspace:*"
}
```

### 隔離檢查

```bash
# 檢查循環依賴（包括衛星間）
bun run scripts/generate-dependency-graph.ts

# 檢查是否有衛星間的直接導入
grep -r "from '@gravito/satellite-" satellites/*/src
# 應該只有基礎層包，沒有 satellite-* 導入

# Pre-push hook 會自動檢查
git push  # 自動驗證
```

---

## 完整檢查清單

開發前檢查（預防問題）：

- [ ] 包邊界清晰（只透過 index.ts 導出）
- [ ] 無跨衛星直接導入（衛星只依賴基礎層）
- [ ] 無循環依賴（執行 generate-dependency-graph.ts）
- [ ] TypeScript 嚴格模式啟用
- [ ] 版本號一致

提交前檢查（強制執行）：

```bash
# Pre-commit hook
bun run check:fix      # 自動修復格式和 lint

# Pre-push hook
bun run scripts/validate-affected-packages.ts  # 驗證構建

# 手動檢查
bun run typecheck:full # 完整類型檢查
bun run test           # 執行測試
bun run version:check  # 驗證版本一致性
```

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [Galaxy Architecture 設計原則](./design.md) - 包分層、設計哲學
- [架構模式與最佳實踐](./patterns.md) - 設計模式、開發流程
- [工具配置詳情](./config.md) - Turbo、TypeScript、Biome 配置
