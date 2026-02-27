# Galaxy Architecture 設計原則

> **用途**：Gravito 銀河架構設計、包分層、核心哲學
> **何時查閱**：理解架構整體設計、評估包位置、架構決策時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## Galaxy Architecture（銀河架構）概述

Gravito 採用「銀河架構」設計理念，將軟體系統結構比擬為宇宙中心力模型：

```
☀️ PlanetCore (中心微核心)
  └─ 所有層級的基礎
     ├─ Hooks 系統
     ├─ IoC 容器
     ├─ 生命週期管理
     └─ 事件發射

🪐 Orbits (圍繞核心的軌道)
  └─ 圍繞核心運行的基礎設施
     ├─ @gravito/photon (HTTP 引擎)
     ├─ @gravito/atlas (ORM + 資料庫)
     ├─ @gravito/signal (事件總線)
     ├─ @gravito/stream (流處理)
     └─ ... 約 50+ 核心軌道包

🛰️ Satellites (自由運行的衛星)
  └─ 獨立的業務領域系統
     ├─ @gravito/satellite-catalog
     ├─ @gravito/satellite-membership
     ├─ @gravito/satellite-commerce
     └─ ... 約 15+ 衛星
```

### 核心設計哲學

| 原則 | 含義 | 好處 |
|---|---|---|
| **核心最小化** | PlanetCore 盡可能輕薄 | 易於維護，減少版本變動 |
| **軌道通用性** | Orbit 包通用、可組合 | 靈活構建，支援多種場景 |
| **衛星獨立性** | Satellite 互不依賴 | 可獨立開發、測試、部署 |
| **向心依賴** | 外層依賴內層，不反向 | 清晰的依賴流，易於變更 |

---

## 包分層詳解

### Layer 1：Foundation（基礎層）

**職責**：提供通用基礎功能，所有其他包都依賴

#### @gravito/core（PlanetCore 微核心）

```typescript
// 核心責任
- Hooks 系統（生命週期鉤子）
- IoC 容器（依賴注入）
- 應用生命週期管理
- 事件發射機制
- 配置管理
```

**特性**：
- ✅ 無外部依賴（零依賴原則）
- ✅ 所有包的必依賴
- ✅ 版本穩定，少有重大更新
- ✅ 約 200-300 行核心代碼

**被誰依賴**：所有 64 個核心包 + 15 個衛星

#### @gravito/photon（HTTP 引擎）

```typescript
// 基於 Hono 的 Web 框架集成
- HTTP 路由
- 中介軟體系統
- 請求/回應處理
- 協議支援（WebSocket 等）
```

**依賴**：core

**被誰依賴**：任何需要 Web 伺服器的包或衛星

#### @gravito/atlas（ORM + 資料庫）

```typescript
// 資料庫抽象層
- ORM 映射（支持 MySQL、PostgreSQL、SQLite）
- 資料庫遷移
- 連接池管理
- 查詢構建器
```

**依賴**：core

**被誰依賴**：需要資料庫訪問的包和衛星

#### @gravito/signal（事件總線）

```typescript
// 跨模組通訊系統
- 事件發佈/訂閱
- 事件過濾與路由
- 非同步事件傳遞
- 事件優先級
```

**依賴**：core

**被誰依賴**：需要跨模組通訊的包和衛星

### Layer 2：Advanced（進階層）

**職責**：提供專門功能，可選依賴基礎層

#### @gravito/stream（流處理與隊列）

```typescript
// 非同步流處理
- BullMQ 隊列集成
- 背壓機制
- 事件優先級隊列
- 背景任務處理
```

**依賴**：core + signal

**特性**：可選，用於複雜的非同步場景

#### @gravito/astral（API 文檔）

```typescript
// Schema 驅動的 API 文檔
- OpenAPI 自動生成
- Swagger UI 集成
- Schema 驗證
```

**依賴**：core

#### @gravito/enterprise（企業級架構）

```typescript
// DDD + Clean Architecture
- Domain-Driven Design 支援
- Use Case 層支援
- 值對象與聚合根
```

**依賴**：core

#### @gravito/monolith（整合層）

```typescript
// 多模組整合
- 將多個包組合
- 共同配置與初始化
- 統一入口點
```

**依賴**：core + photon + atlas + signal（所有基礎層）

**特性**：可用於 scaffolding 和範本

### Layer 3：Satellites（衛星層）

**職責**：實現業務領域邏輯，完全隔離

#### 衛星特性

```typescript
// 衛星必備結構
{
  "name": "@gravito/satellite-<domain>",
  "private": true,  // 不發佈到 npm
  "dependencies": {
    "@gravito/core": "workspace:*",
    "@gravito/atlas": "workspace:*",
    "@gravito/signal": "workspace:*"
  }
}
```

#### 衛星列表

| 衛星 | 領域 | 依賴 | 職責 |
|---|---|---|---|
| `satellite-catalog` | 商品管理 | core + atlas + signal | 商品、分類、SKU 管理 |
| `satellite-membership` | 用戶管理 | core + atlas + signal + fortify | 用戶、會員、認證 |
| `satellite-commerce` | 訂單管理 | core + atlas + signal | 訂單、購物車 |
| `satellite-payment` | 支付 | core + atlas + signal | 支付方式、交易 |
| `satellite-analytics` | 分析 | core + atlas + signal | 數據分析、報告 |
| `satellite-support` | 支持系統 | core + atlas + signal | 工單、FAQ |
| `satellite-news` | 內容管理 | core + atlas + signal | 文章、出版 |
| `satellite-logistics` | 物流 | core + atlas + signal | 配送、追蹤 |
| ... | ... | ... | ... |

---

## 依賴流向圖

### 單向依賴流

```
Foundation Layer (基礎層)
  ├── core (無依賴)
  ├── photon → core
  ├── atlas → core
  └── signal → core

Advanced Layer (進階層)
  ├── stream → core, signal
  ├── astral → core
  ├── enterprise → core
  └── monolith → core, photon, atlas, signal

Satellites (衛星層)
  ├── satellite-catalog → core, atlas, signal
  ├── satellite-membership → core, atlas, signal, fortify
  ├── satellite-commerce → core, atlas, signal
  └── ... (所有衛星遵循相同模式)
```

**關鍵原則**：
- ✅ 內層不依賴外層（core 不知道 photon）
- ✅ 衛星間不相互依賴（commerce 不依賴 catalog）
- ✅ 跨衛星通訊透過 signal（事件總線）
- ✅ 沒有循環依賴

---

## 包職責邊界

### Foundation 層職責邊界

```
@gravito/core
  ✅ 提供：IoC、Hooks、生命週期、事件
  ❌ 不提供：HTTP、資料庫、業務邏輯

@gravito/photon
  ✅ 提供：HTTP 路由、中介軟體
  ❌ 不提供：ORM、業務邏輯、認證系統

@gravito/atlas
  ✅ 提供：ORM、遷移、查詢
  ❌ 不提供：業務驗證、業務邏輯

@gravito/signal
  ✅ 提供：事件發佈/訂閱、路由
  ❌ 不提供：業務事件定義
```

### Satellite 職責邊界

```
satellite-catalog
  ✅ 提供：商品、SKU、分類管理
  ❌ 依賴其他衛星（必須透過事件）

satellite-membership
  ✅ 提供：用戶、會員管理
  ❌ 調用 catalog 系統（必須透過事件）
```

---

## 為什麼這樣設計？

### 1. 可維護性

- **核心小**：PlanetCore 只有 200-300 行，易於理解
- **變更隔離**：修改 core 的 Hooks 只需驗證 64 個包，不涉及衛星
- **版本穩定**：基礎層版本變化少，用戶升級成本低

### 2. 可擴展性

- **衛星獨立**：新增衛星只需依賴核心層，無需改動現有衛星
- **組合靈活**：基礎層 4 個包可自由組合構建應用
- **領域隔離**：每個衛星專注於一個業務領域

### 3. 可部署性

- **獨立部署**：衛星可單獨構建、測試、部署
- **版本協調**：所有包保持相同版本號，簡化用戶依賴管理
- **漸進升級**：基礎層更新時，衛星無需立即升級

### 4. 可測試性

- **邊界清晰**：每個包職責明確，易於單測
- **依賴注入**：IoC 容器使 mock 和測試簡單
- **事件驅動**：事件通訊易於模擬和驗證

---

## 設計演進

### v1.0 - 初始架構

```
簡單模型：Core + Satellites
- 4 個基礎包（core、photon、atlas、signal）
- 13 個業務衛星
```

### v1.1 - 進階層添加

```
引入 Advanced 層：
- stream（流處理）
- astral（API 文檔）
- enterprise（DDD 支援）
- monolith（整合）

好處：支援更複雜的應用場景
```

### v1.2+ - 持續優化

```
計劃方向：
- 更多專門化衛星
- 跨衛星協調機制加強
- 性能優化（背壓機制）
```

### v2.0 - Architecture Optimization（Phase 2.x）

v2.0 針對框架核心進行系統性架構優化，目標是降低包間耦合、減少核心體積、提升可維護性。

#### Phase 2.1：移除 core→photon 循環依賴

- 將 core 中的 HTTP 中間件（bodySizeLimit、cors、csrfProtection、securityHeaders 等）完整遷移至 `@gravito/photon/middleware`
- 移除 core 對 photon 的直接依賴（從 externalDeps 中刪除）
- 提供子路徑導入：`middleware/security`、`middleware/body`、`middleware/cors`、`middleware/rate-limit`
- 零破壞性變更，附帶遷移指南

#### Phase 2.2：提取 OpenTelemetry 抽象層

- 在 `@gravito/core` 中定義 Observability 合約接口（EventMetricsRecorder、EventTracingProvider、ObservabilityProvider 等），移除所有 OTel 直接依賴
- 在 `@gravito/monitor` 中實作具體適配器（OTelEventMetricsRecorder、OTelEventTracingProvider、OTelWorkerMetricsProvider）
- 架構：`core（無 OTel 依賴）→ monitor（9 OTel 依賴）→ OpenTelemetry SDK`
- Observability 變為可選、可插拔的功能

#### Phase 2.3：實施 @gravito/resilience 核心測試

- 新建 `@gravito/resilience` v1.0.0，從 core 中提取韌性模式
- 涵蓋：Circuit Breaker、Dead Letter Queue、Backpressure 控制、Worker Pool 管理、事件優先級隊列
- 182 個測試通過，2,563 行測試代碼，365 個斷言
- 釐清韌性模式架構文檔，明確 core 與 resilience 的職責邊界

#### Phase 2.4：最終驗證與清理

- 全量構建與類型檢查驗證
- 確認所有依賴包正常運作
- 文檔更新與版本同步

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [Monorepo 約束](./constraints.md) - 包邊界、循環依賴防止
- [架構模式與最佳實踐](./patterns.md) - 設計模式、開發流程
- [WHITEPAPER_ZH_TW.md](../../WHITEPAPER_ZH_TW.md) - 完整架構白皮書
