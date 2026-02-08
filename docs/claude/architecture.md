# 架構與設計

> **用途**：Gravito Galaxy Architecture（GGA）原則、Monorepo 約束、跨包修改指南
> **何時查閱**：設計新功能、添加包、修改跨包依賴時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## Galaxy Architecture（銀河架構）簡述

Gravito 基於「銀河架構」設計，將軟體層次比擬為宇宙結構：

```
☀️ PlanetCore (中心微核心)
  ├─ Hooks 系統
  ├─ IoC 容器
  ├─ 生命週期管理
  └─ 事件發射

🪐 Orbits (圍繞核心的軌道)
  ├─ @gravito/photon (HTTP)
  ├─ @gravito/atlas (ORM)
  ├─ @gravito/signal (事件總線)
  ├─ @gravito/stream (流處理)
  └─ ... 約 50+ 核心包

🛰️ Satellites (業務領域外掛)
  ├─ @gravito/satellite-catalog
  ├─ @gravito/satellite-membership
  ├─ @gravito/satellite-commerce
  └─ ... 約 13+ Satellites
```

**原則**：核心越簡潔，軌道模組越通用，衛星越容易隔離。

---

## 包分層概覽

### Foundation Layer（基礎層）

**職責**：提供通用基礎功能，被所有其他包依賴

| 包名 | 用途 | 可被誰依賴 |
|---|---|---|
| `@gravito/core` | IoC、Hooks、Container | 所有包 |
| `@gravito/photon` | HTTP 伺服器（Hono） | 任何需要 Web 的包 |
| `@gravito/atlas` | ORM、資料庫遷移 | 需要資料庫的包 |
| `@gravito/signal` | 事件總線 | 需要通訊的包 |

**依賴流向**（單向）：

```
core ← photon
core ← atlas
core ← signal
```

### Advanced Layer（進階層）

**職責**：提供專門功能，可選依賴基礎層

| 包名 | 依賴 | 用途 |
|---|---|---|
| `@gravito/stream` | core + signal | 流處理與隊列（BullMQ） |
| `@gravito/astral` | core | OpenAPI + Swagger |
| `@gravito/enterprise` | core | DDD + Clean Architecture |
| `@gravito/monolith` | core + photon + atlas + signal | 整合層 |

**約束**：
- 進階層包互相獨立（除了 monolith）
- 不應被基礎層依賴（無反向依賴）

### Satellites（衛星層）

**職責**：實現業務領域邏輯，完全隔離

| 衛星 | 依賴 | 職責 |
|---|---|---|
| `satellite-catalog` | core + atlas + signal | 商品管理 |
| `satellite-membership` | core + atlas + signal + fortify | 用戶管理 |
| `satellite-commerce` | core + atlas + signal | 訂單管理 |
| ... | ... | ... |

**隔離規則（必須遵守）**：
- Satellite A 禁止直接導入 Satellite B
- 跨衛星通訊必須透過 `@gravito/signal`（事件）
- 禁止循環依賴：A → B → A

**違反隔離的後果**：
- Pre-push hook 失敗
- CI 構建中止
- 模組加載順序依賴不確定

---

## Monorepo 約束

### 1. 包邊界清晰

```
packages/core/
  ├── src/
  │   ├── application.ts
  │   ├── hooks/
  │   ├── container/
  │   ├── events/
  │   └── index.ts （唯一的公開接口）
  ├── tests/
  ├── package.json
  └── tsconfig.json

satellites/catalog/
  ├── src/
  │   ├── models/
  │   ├── use-cases/
  │   ├── repositories/
  │   └── index.ts
  └── tests/
```

**原則**：只透過 `index.ts` 暴露公開 API，內部目錄不應直接導入

**違反例**：
```typescript
// ❌ WRONG
import { HookManager } from '@gravito/core/container/HookManager'

// ✅ CORRECT
import { HookManager } from '@gravito/core'  // 透過 index.ts 導出
```

### 2. 包版本一致性

所有 `@gravito/*` 包應保持相同版本號（語義化版本）：

```
@gravito/core@1.2.3
@gravito/photon@1.2.3
@gravito/atlas@1.2.3
```

**檢查方式**：
```bash
bun run version:check
```

**為什麼**：
- 簡化用戶依賴管理
- 防止版本不相容
- 統一發佈節奏

### 3. 不允許循環依賴

```
// ❌ 禁止
A → B → A

// ✅ 允許（透過事件總線）
A → Event Bus ← B
```

**檢查工具**：
```bash
bun run scripts/generate-dependency-graph.ts
```

**解決方案**：
- 提取公共模組到第三個包
- 使用事件總線（Signal）替代直接依賴
- 重新評估包邊界

### 4. TypeScript 嚴格模式

所有包必須開啟：
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**目的**：防止未使用代碼引發跨包問題

---

## 跨包修改指南

### 案例 1：修改基礎層包（如 core）

```bash
# 1. 修改 packages/core/src/...
nano packages/core/src/hooks/Hooks.ts

# 2. 添加或更新測試
nano packages/core/tests/hooks/Hooks.test.ts

# 3. 更新 index.ts（如有新導出）
nano packages/core/src/index.ts

# 4. 本地驗證
cd packages/core && bun test
bun run typecheck

# 5. 驗證依賴此包的所有包
bun run scripts/validate-affected-packages.ts
# 自動檢查：photon, atlas, signal, stream, monolith 等

# 6. 提交
git add packages/core
git commit -m "feat: [core] Add new hook feature"
```

**檢查清單**：
- [ ] 修改在 `src/` 中
- [ ] 測試在 `tests/` 中，覆蓋率 ≥ 75%
- [ ] 新導出加到 `index.ts`
- [ ] 單一包測試通過
- [ ] 完整類型檢查通過
- [ ] 受影響包驗證通過

### 案例 2：添加 Satellite（新業務模組）

```bash
# 1. 創建目錄結構
mkdir -p satellites/my-feature/src/{models,use-cases,repositories,events}
mkdir satellites/my-feature/tests

# 2. 初始化 package.json
cat > satellites/my-feature/package.json << 'EOF'
{
  "name": "@gravito/satellite-my-feature",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@gravito/core": "workspace:*",
    "@gravito/atlas": "workspace:*",
    "@gravito/signal": "workspace:*"
  },
  "devDependencies": {
    "typescript": "workspace:*"
  }
}
EOF

# 3. 創建 tsconfig.json
cat > satellites/my-feature/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist" },
  "include": ["src"]
}
EOF

# 4. 實作模組
# src/models/MyModel.ts
# src/use-cases/CreateMyModel.ts
# src/repositories/MyModelRepository.ts
# src/events/MyModelCreatedEvent.ts
# src/index.ts

# 5. 在 gravito.config.ts 中註冊（如果需要）
nano gravito.config.ts

# 6. 安裝依賴
bun install

# 7. 驗證
bun run typecheck
bun run test

# 8. 提交
git add satellites/my-feature
git commit -m "feat: [satellite-my-feature] Add new business module"
```

### 案例 3：修改跨包依賴

```bash
# 場景：satellite-commerce 需要新增 @gravito/payment 依賴

# 1. 修改 package.json
nano satellites/commerce/package.json
# 添加："@gravito/payment": "workspace:*"

# 2. 重新安裝
bun install

# 3. 驗證解析
bun run typecheck

# 4. 檢查版本一致性
bun run version:check

# 5. 驗證受影響的包
bun run scripts/validate-affected-packages.ts

# 6. 提交
git add satellites/commerce/package.json bun.lockb
git commit -m "chore: [satellite-commerce] Add @gravito/payment dependency"
```

---

## 常見架構模式

### 1. 事件驅動通訊（推薦）

```typescript
// satellite-inventory/src/events/InventoryLowEvent.ts
export class InventoryLowEvent {
  constructor(
    public productId: string,
    public quantity: number
  ) {}
}

// satellite-inventory/src/index.ts
export async function checkAndNotify(signal: SignalBus) {
  const lowItems = await checkInventory()
  for (const item of lowItems) {
    await signal.emit(new InventoryLowEvent(item.id, item.qty))
  }
}

// satellite-notification/src/index.ts（監聽同衛星中的事件）
signal.on(InventoryLowEvent, async (event) => {
  await sendAlertToAdmin(event)
})
```

**優點**：
- ✅ 衛星完全解耦
- ✅ 易於測試（模擬事件）
- ✅ 支援非同步流程

### 2. 共享模型（基礎層）

```typescript
// packages/mass/src/ValueObjects.ts（共享驗證邏輯）
export const EmailSchema = z.string().email()

// satellite-membership/src/models/User.ts
import { EmailSchema } from '@gravito/mass'

export const UserSchema = z.object({
  email: EmailSchema
})
```

**優點**：
- ✅ 單一驗證邏輯源
- ✅ 防止驗證不一致

### 3. 倉庫模式（Satellite 內部）

```typescript
// satellite-catalog/src/repositories/ProductRepository.ts
export interface ProductRepository {
  findAll(): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  create(data: CreateProductDto): Promise<Product>
}

// satellite-catalog/src/index.ts
export { ProductRepository }

// 其他衛星若需要，透過事件而非直接依賴
```

---

## 禁止模式（Anti-Pattern）

### ❌ 直接衛星間導入

```typescript
// WRONG: satellite-commerce/src/OrderService.ts
import { InventoryService } from '@gravito/satellite-inventory'

export class OrderService {
  async createOrder(productId: string) {
    // 直接調用其他衛星
    await InventoryService.deduct(productId)
  }
}
```

**為什麼禁止**：
- 建立循環依賴風險
- 衛星不可獨立部署
- Pre-push hook 會失敗

### ✅ 透過事件通訊

```typescript
// CORRECT: satellite-commerce/src/OrderService.ts
import { signal } from '@gravito/signal'

export class OrderService {
  async createOrder(productId: string) {
    // 發佈事件，讓 satellite-inventory 監聽
    await signal.emit(new OrderCreatedEvent(productId))
  }
}

// satellite-inventory 在 bootstrap 時監聽
signal.on(OrderCreatedEvent, async (event) => {
  await InventoryService.deduct(event.productId)
})
```

### ❌ 跨包直接導入內部模組

```typescript
// WRONG
import { HookManager } from '@gravito/core/container/HookManager'
import { InternalUtil } from '@gravito/atlas/internal/utils'
```

### ✅ 透過公開 API（index.ts）

```typescript
// CORRECT
import { HookManager, InternalUtil } from '@gravito/core'
import { createRepository } from '@gravito/atlas'
```

---

## 新功能開發流程

### 第 1 步：評估位置

**應該在哪個包中實作？**

```
功能類型              │ 推薦位置
─────────────────────┼───────────────
多個衛星需要用        │ 基礎層包（core, mass, etc.）
特定業務領域邏輯      │ 對應 Satellite
跨衛星協調            │ Monolith 或 Signal
HTTP 相關             │ Photon 或具體 Satellite
資料庫相關            │ Atlas 或具體 Satellite
```

### 第 2 步：設計接口

在修改代碼前，確保：
- [ ] 新功能的公開 API 清晰
- [ ] 與現有包的依賴關係確定
- [ ] 是否需要跨衛星通訊

### 第 3 步：實作 + 測試

```bash
# 添加代碼
nano packages/<name>/src/NewFeature.ts

# 添加測試（覆蓋率優先）
nano packages/<name>/tests/NewFeature.test.ts

# 導出 API
nano packages/<name>/src/index.ts
```

### 第 4 步：驗證

```bash
# 本地驗證
bun run typecheck && bun run check && bun test

# 跨包驗證
bun run scripts/validate-affected-packages.ts

# 如有變更，創建 Changeset
bun run changeset
```

### 第 5 步：提交

```bash
git add <modified-files>
git commit -m "feat: [module] Add NewFeature"
git push  # Pre-push hook 自動驗證
```

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [開發工作流程](./development.md)
- [包功能速查表](./packages.md)
- [工具配置詳情](./config.md)
- [docs/spec/ARCHITECTURE_SPEC.md](../spec/ARCHITECTURE_SPEC.md) - 詳細架構規格
- [WHITEPAPER_ZH_TW.md](../../WHITEPAPER_ZH_TW.md) - 完整架構白皮書
