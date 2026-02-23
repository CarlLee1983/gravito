# Galaxy Architecture 微核心設計 - 深度技術研究

## 1. 背景與演進 (Background)

### 1.1 為什麼需要微核心設計？

傳統單體框架的痛點：
- 核心包體積龐大（通常 1000+ 行代碼）
- 基礎層頻繁變動，影響所有依賴包
- 版本升級成本高，破壞性變更難以避免
- 難以支援多種應用場景的靈活組合

Gravito 的解決方案：**微核心架構**
```
傳統框架：Core (1000+ 行) → 所有包 (66+)
Gravito：Core (~800 行) → 所有包 (66+) + Satellites (15+)
```

### 1.2 銀河架構的比喻

```
        ☀️ PlanetCore
       /  |  \  \  \
      /   |   \  \  \
   🪐 Orbits (基礎層)
      \   |   /  /  /
       \  |  /  /  /
        🛰️ Satellites (衛星層)
```

- **PlanetCore**：中心微核心，無外部依賴
- **Orbits**：圍繞核心的基礎層（photon、atlas、signal、stream 等）
- **Satellites**：自由運行的業務衛星，透過事件系統通訊

---

## 2. 微核心核心元件 (Core Components)

### 2.1 PlanetCore 的核心責任

| 責任 | 目的 | 狀態 |
|---|---|---|
| **Hooks 系統** | 生命週期鉤子，支援 OTel 觀測 | 已優化 |
| **IoC 容器** | 依賴注入，解耦對象構造與使用 | 穩定 |
| **HttpAdapter** | 解耦 HTTP 引擎（v2.0+ 新增） | 核心特性 |
| **應用生命週期** | 初始化、啟動、關閉流程管理 | 穩定 |
| **事件發射機制** | 基礎事件系統，signal 構建基礎 | 穩定 |

**現狀**：`PlanetCore.ts` 核心實作約 808 行，保持了高度的內聚性與擴展性。

### 2.2 Hooks 系統與可觀測性

Hooks 提供應用各個生命週期階段的擴展點，並在 v2.0 中引入了 `ObservableHookManager` 以支援 OpenTelemetry (OTel) 監控。

```typescript
// 生命週期流程
beforeCreate → created → beforeSetup → setup → beforeMount → mounted → beforeDestroy → destroyed

// 應用層級
app.hook('beforeCreate', () => { /* 應用初始化前 */ })

// 模組層級
container.module('catalog').hook('beforeMount', () => { /* 模組掛載前 */ })
```

**Hooks 的優點**：
- ✅ 非侵入式擴展
- ✅ 支援多個監聽器（數組形式）
- ✅ 可控的執行順序
- ✅ 易於測試和模擬

**典型使用場景**：
1. **beforeCreate**：驗證環境變數
2. **setup**：初始化數據庫連接、緩存
3. **beforeMount**：應用初始化完成前的檢查
4. **beforeDestroy**：清理資源、關閉連接

### 2.3 IoC 容器設計

依賴注入容器是框架的核心：

```typescript
interface Container {
  // 服務註冊
  set<T>(key: string, factory: () => T): void
  provide<T>(key: string, value: T): void
  singleton<T>(key: string, factory: () => T): void

  // 服務取得
  get<T>(key: string): T
  has(key: string): boolean

  // 模組管理
  module(name: string): ModuleContainer
}
```

**三種註冊方式**：

1. **工廠模式**（每次創建新實例）
```typescript
container.set('service', () => new MyService())
const s1 = container.get('service')  // 新實例
const s2 = container.get('service')  // 不同實例
```

2. **單例模式**（全局共享實例）
```typescript
container.singleton('database', () => new Database())
const db1 = container.get('database')  // 同一實例
const db2 = container.get('database')  // db1 === db2
```

3. **值注入**（直接提供值）
```typescript
container.provide('config', { port: 3000 })
const config = container.get('config')
```

**IoC 優勢**：
- 易於測試（注入 mock 對象）
- 解耦對象間依賴
- 支援動態依賴解析
- 模組間依賴清晰

### 2.4 應用生命週期

```typescript
// 初始化階段
const app = createApp(config)

// 設置階段（執行 setup hook）
await app.setup()

// 啟動階段
await app.start()

// 運行階段（應用正常運行）

// 關閉階段
await app.destroy()
```

**每個階段的職責**：
- `setup()`：初始化容器、註冊服務、執行 setup hook
- `start()`：啟動 HTTP 服務器、初始化衛星
- `destroy()`：清理資源、關閉數據庫、執行 destroy hook

---

## 3. 三層架構詳解 (Three-Layer Architecture)

### 3.1 Layer 1：Foundation（基礎層）

**目標**：提供通用基礎設施，無業務邏輯

#### @gravito/core（PlanetCore）
- 零外部依賴
- 支援 HttpAdapter 模式（解耦 Hono/Photon）
- 版本穩定（很少重大更新）

#### @gravito/photon（HTTP 引擎）
- 作為 `PhotonAdapter` 的官方實作
- 路由、中介軟體系統
- 支援 WebSocket、SSE 等協議

#### @gravito/atlas（ORM 層）
- 資料庫抽象層
- 支援 MySQL、PostgreSQL、SQLite
- 遷移、連接池、查詢構建器

#### @gravito/signal（事件總線）
- Pub/Sub 系統
- 事件路由與過濾
- 非同步事件傳遞

**基礎層依賴流**：
```
Core (無依賴)
├── Photon → Core
├── Atlas → Core
└── Signal → Core
```

### 3.2 Layer 2：Advanced（進階層）

**目標**：支援特定場景，可選依賴

#### @gravito/stream（流處理）
- BullMQ 隊列集成
- 背壓機制
- 後台任務處理

#### @gravito/enterprise（企業級）
- Domain-Driven Design 支援
- Clean Architecture 模式
- 值對象與聚合根

#### @gravito/astral（API 文檔）
- OpenAPI 自動生成
- Swagger UI 集成
- Schema 驗證

#### @gravito/monolith（整合層）
- 將基礎層包組合
- 共同配置與初始化
- 單體應用統一入口

**進階層特點**：
- 可選依賴（非所有應用都需要）
- 構建在基礎層之上
- 支援特定應用模式

### 3.3 Layer 3：Satellites（衛星層）

**目標**：實現業務邏輯，完全隔離

**衛星隔離原則**：
```typescript
// ❌ 禁止直接依賴其他衛星
import { CatalogService } from '@gravito/satellite-catalog'  // 錯誤

// ✅ 必須透過事件系統通訊
container.get('eventBus').on('catalog:product:created', (event) => {
  // 處理商品創建事件
})
```

**衛星典型結構**：
```
satellite-catalog/
├── src/
│   ├── entities/        # 數據模型
│   ├── services/        # 業務邏輯
│   ├── events/          # 事件定義
│   ├── api/             # HTTP 端點
│   └── index.ts         # 衛星導出
├── tests/               # 測試
└── package.json         # 依賴（僅 core、atlas、signal）
```

**當前衛星列表**：
- `satellite-catalog`：商品管理
- `satellite-membership`：用戶與認證
- `satellite-commerce`：訂單管理
- `satellite-payment`：支付處理
- `satellite-analytics`：數據分析
- ... 約 15+ 個衛星

---

## 4. 設計決策與權衡 (Design Decisions)

### 4.1 為什麼 PlanetCore 要保持精簡？

| 考慮 | 核心精簡 (Gravito) | 龐大核心 |
|---|---|---|
| **維護成本** | 低（~800 行易理解） | 高（數千行複雜） |
| **版本變化** | 穩定（核心協議少改動） | 頻繁（功能堆疊） |
| **適配能力** | 高（支援多種 Adapter） | 低（綁定特定引擎） |
| **學習曲線** | 專注核心概念 | 平緩但內容龐雜 |

**決策**：優化長期可維護性，而非初期簡單性。

### 4.2 為什麼採用事件系統而非直接依賴？

**衛星間通訊方案比較**：

```typescript
// 方案 A：直接依賴（禁止）
import { CatalogService } from '@gravito/satellite-catalog'
export class CommerceService {
  constructor(private catalog: CatalogService) {}

  async checkout() {
    const products = await this.catalog.getProducts()
  }
}
// 問題：satellite-commerce 依賴 satellite-catalog，形成耦合
```

```typescript
// 方案 B：事件系統（推薦）
export class CommerceService {
  constructor(private eventBus: EventBus) {}

  async checkout() {
    const event = new ProductQueryEvent()
    const result = await this.eventBus.emit(event)
  }
}
// 優點：零耦合，衛星可獨立開發與部署
```

**事件系統優勢**：
- ✅ 衛星間松耦合
- ✅ 易於測試（mock EventBus）
- ✅ 支援異步通訊
- ✅ 易於新增衛星

### 4.3 為什麼使用 Hooks 而非傳統配置？

```typescript
// 傳統配置（靜態）
const config = {
  plugins: [
    { name: 'database', options: { host: 'localhost' } },
    { name: 'cache', options: { ttl: 3600 } }
  ]
}

// Hooks（動態）
app.hook('beforeSetup', async () => {
  const dbUrl = await fetchFromVault('db-url')
  container.singleton('database', () => new Database(dbUrl))
})
```

**Hooks 優勢**：
- ✅ 支援非同步初始化
- ✅ 可動態調整（如基於環境變數）
- ✅ 多個擴展點不衝突
- ✅ 易於條件執行

---

## 5. 實現細節與最佳實踐 (Implementation Details)

### 5.1 容器初始化流程

```typescript
// 1. 創建應用
const app = createApp({
  name: 'my-app',
  version: '1.0.0'
})

// 2. 註冊基礎服務
const container = app.container
container.singleton('config', () => loadConfig())
container.singleton('database', () => new Database())

// 3. 註冊中介軟體和路由
const photon = container.get('photon')
photon.use(authMiddleware)
photon.post('/api/users', createUserHandler)

// 4. 初始化和啟動
await app.setup()    // 執行 beforeCreate、created、setup hook
await app.start()    // 啟動 HTTP 服務器、執行 mounted hook
```

### 5.2 多模組管理

```typescript
// 為衛星創建子容器
const catalogModule = container.module('catalog')
catalogModule.set('catalogService', () => new CatalogService())
catalogModule.hook('beforeMount', () => {
  console.log('Catalog 衛星準備掛載')
})

// 在 satellites 中使用子容器
export function setupCatalog(container: Container) {
  const catalogContainer = container.module('catalog')
  const catalogService = catalogContainer.get('catalogService')
  // ...
}
```

### 5.3 Hook 執行順序保證

```typescript
// Hooks 執行順序（同步）
app.hook('beforeCreate', () => console.log('1'))
app.hook('beforeCreate', () => console.log('2'))  // 多個 hook 依次執行
app.hook('created', () => console.log('3'))

await app.setup()
// 輸出：1 → 2 → 3
```

### 5.4 單測與集成測試

```typescript
// 單測：使用 mock 容器
describe('CommerceService', () => {
  it('should checkout', async () => {
    const mockCatalog = { getProducts: () => [...] }
    const container = createTestContainer()
    container.provide('catalog', mockCatalog)

    const service = container.get('commerceService')
    const result = await service.checkout()
    expect(result.total).toBe(100)
  })
})

// 集成測試：完整初始化
describe('E2E Checkout', () => {
  let app: App

  beforeAll(async () => {
    app = createApp(testConfig)
    await app.setup()
    await app.start()
  })

  it('should process checkout end-to-end', async () => {
    const response = await fetch('http://localhost:3000/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [...] })
    })
    expect(response.status).toBe(200)
  })

  afterAll(() => app.destroy())
})
```

---

## 6. 性能與擴展性 (Performance & Scalability)

### 6.1 容器性能

| 操作 | 成本 | 優化 |
|---|---|---|
| 服務註冊 | O(1) | 無 |
| 服務查詢（非單例） | O(1)（工廠執行） | 使用單例 |
| 服務查詢（單例） | O(1) | 利用緩存 |
| 容器複製（模組） | O(n)，n=服務數 | 減少模組數 |

### 6.2 Hook 性能

```typescript
// Hook 註冊數量影響初始化時間
app.hook('beforeCreate', () => { /* A */ })  // ~0.1ms
app.hook('beforeCreate', () => { /* B */ })  // 多個 hook 不推薦 100+

// 優化：使用複合 hook
app.hook('beforeCreate', async () => {
  await taskA()
  await taskB()
  await taskC()
})  // 單一 hook 執行 ~0.5ms
```

### 6.3 衛星擴展性

**支援衛星數量**：
- 當前架構：15+ 衛星無問題
- 理論上限：100+ 衛星（取決於事件系統效率）

**衛星間通訊成本**：
```
直接依賴：極快（同步函數調用）
事件系統：略慢（異步消息隊列）

權衡：犧牲 <5% 性能換取架構靈活性
```

### 6.4 內存使用

```
PlanetCore 內存占用：~100KB
Container 實例大小：~50KB（含 10 個服務）
衛星加載：按需加載，不影響啟動時間
```

---

## 7. 與其他架構的對比 (Comparison)

### 7.1 vs. Next.js 插件系統

| 特性 | Gravito | Next.js |
|---|---|---|
| 核心大小 | ~800 行 | 100K+ 行 |
| 依賴注入 | ✅ 原生 | ❌ 手動 |
| 生命週期 | ✅ Hooks | ❌ API Routes |
| 模組隔離 | ✅ 衛星 | ❌ 頁面隔離 |
| 後端集成 | ✅ 統一 | ⚠️ 分散 |

### 7.2 vs. NestJS 模組系統

| 特性 | Gravito | NestJS |
|---|---|---|
| 學習曲線 | 陡峭 | 平緩 |
| 內核大小 | 小（微） | 中等 |
| 版本穩定 | ✅ 高 | ❌ 頻變 |
| 企業級 | ⚠️ 進行中 | ✅ 成熟 |
| 靈活性 | ✅ 高 | ⚠️ 固定模式 |

---

## 8. 未來演進方向 (Roadmap)

### 8.1 短期（v1.2 - 半年內）

- [ ] Hooks 性能優化
- [ ] 衛星間協調機制（Saga 模式）
- [ ] 分佈式事件系統（支援跨進程通訊）

### 8.2 中期（v1.3 - 一年內）

- [ ] GraphQL 支援
- [ ] 微服務模式（衛星獨立部署）
- [ ] 動態模組加載（Runtime 新增衛星）

### 8.3 長期（v2.0+）

- [ ] 專案模板生成器
- [ ] 可視化架構編輯器
- [ ] AI 輔助開發工具

---

## 9. 相關文檔與資源

- **[docs/claude/design.md](../../claude/design.md)** - Galaxy Architecture 完整設計指南
- **[docs/claude/patterns.md](../../claude/patterns.md)** - 架構模式與最佳實踐
- **[docs/claude/constraints.md](../../claude/constraints.md)** - Monorepo 約束與規範
- **[packages/core/src/PlanetCore.ts](../../packages/core/src/PlanetCore.ts)** - PlanetCore 核心源代碼 (~808 行)
- **[satellite-catalog/](../../satellites/catalog/)** - 衛星實現參考

---

## 10. 常見 Q&A

**Q: PlanetCore 何時需要版本更新？**
A: 改變 Hooks、IoC、生命週期、或 Adapter 接口等核心 API 時。目標是最小化版本更新頻率。

**Q: 衛星間如何共享數據？**
A: 透過事件系統（Signal）。Commerce 衛星發佈「需要商品列表」事件，Catalog 衛星訂閱並回應。

**Q: 性能關鍵路徑能否使用直接依賴？**
A: 不建議。保持衛星隔離原則可以簡化未來重構（如分佈式部署）。事件系統成本可接受。

**Q: 如何測試衛星間通訊？**
A: 使用 mock EventBus。見 5.4 節。

---

**撰寫日期**：2026-02-23
**版本**：2.0 (Reflecting v2.0 Architecture)
