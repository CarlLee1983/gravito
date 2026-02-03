# 🏗️ Gravito 2.0 架構整合指南

本文檔解釋 Gravito 如何在單體應用中維持 **DDD (Domain-Driven Design)** 與 **Clean Architecture** 的嚴謹性，同時透過 **銀河架構 (Galaxy Architecture) v2.0** 提供極致的效能與開發體驗。

## 1. 核心概念：Galaxy Architecture v2.0

Gravito 2.0 延續並強化了「銀河架構」。系統由三個核心層次構成：

- **PlanetCore (@gravito/core)**: 引力中心，2.0 引入了 **Standalone Engine**，支援極致優化的 Bun 原生 HTTP 處理與物件池 (Object Pooling) 技術。
- **Orbits (基礎設施)**: 圍繞核心的戰略擴展（如 `OrbitAtlas` ORM, `OrbitSignal` 事件總線）。
- **Satellites (領域衛星)**: 獨立的 **Bounded Context**（如 `Catalog`, `Order`），嚴格遵循 Clean Architecture。

### 模組邊界守則
- **禁止直接引用**: `Order` 衛星絕對不能直接 `import` `Catalog` 的 Repository 或 Entity。
- **Use Cases 封裝**: 所有業務邏輯必須封裝在 `UseCase` 類別中。
- **依賴注入**: 透過 `c.get()` 或 `container.make()` 取用共享資源，2.0 支援更高效的延遲解析 (Lazy Resolution)。

## 2. 啟動引擎：Manifest-Driven Development (MDD)

Gravito 2.0 核心推崇「清單驅動開發」，透過 `gravito.config.ts` 宣告式地組裝系統。

1.  **宣告 Manifest**: 在 `gravito.config.ts` 中配置 `orbits` 與 `modules`。
2.  **自動掛載 (Auto-mounting)**: 核心會自動掃描 Satellites 並執行其 `ServiceProvider`。
3.  **生命週期點火**: 
    - `register()`: 註冊 UseCases 與服務。
    - `boot()`: 掛載路由、註冊事件監聽器。
4.  **升空 (Liftoff)**: 呼叫 `liftoff()` 啟動 Bun.serve，並觸發 AOT (Ahead-Of-Time) 路由預編譯。

## 3. 2.0 核心技術：Standalone Engine

### 3.1 核心特性
- **AOT Router**: 啟動時預編譯路由，靜態路徑達成 O(1) 匹配。
- **FastContext**: 實作內部資源池（預設 256 個實例），將每個請求的記憶體分配降至最低。
- **零拷貝 (Zero-copy)**: 直接橋接 `Bun.serve` 原始 Request，減少中間轉換損耗。

### 3.2 Adapter 選擇矩陣
| 場景 | 建議 Adapter | 理由 |
| :--- | :--- | :--- |
| **極致效能 (API/Microservice)** | `GravitoEngineAdapter` | Bun 原生優化，AOT 路由速度最快。 |
| **高度兼容 (Middleware 重度使用)** | `PhotonAdapter` | 基於 Hono，支援所有 Hono 生態系插件。 |
| **Node.js 部署** | `PhotonAdapter` | 提供跨 Runtime 的穩定性。 |

## 4. 效能調優指引 (Performance Tuning)

### 4.1 物件池調整
若您的應用面臨極高併發（High Concurrency），可在啟動時調整池大小：
```typescript
const core = new PlanetCore({
  engineOptions: {
    poolSize: 512 // 針對高併發環境擴大 Context 池
  }
});
```

### 4.2 JIT 預熱 (Predictive Warming)
使用 `core.warmup()` 在 `liftoff` 之前預熱熱點端點，避免首個請求的冷啟動延遲。

## 5. 跨衛星溝通

**情境**: 當訂單支付成功時，通知發票衛星開立發票。

```typescript
// 在 Order Satellite 中 (UseCase)
await this.core.hooks.doAction('order:paid', { orderId: '123' });

// 在 Invoice Satellite 中 (ServiceProvider.boot)
this.core.hooks.addAction('order:paid', async (payload) => {
  await this.container.make(CreateInvoiceUseCase).execute(payload);
});
```

## 6. 整合檢查清單 (Integration Checklist)

- [ ] 所有的衛星依賴是否使用了 `workspace:*`？
- [ ] 所有的 `UseCase` 是否已正確注入 `PlanetCore`？
- [ ] 跨衛星通訊是否已從「直接引用」重構為「Hook/Event」？
- [ ] 是否已針對核心 API 執行了 `core.warmup()`？
- [ ] 資料庫遷移是否已遷移至衛星內部的 `Infrastructure` 目錄？

---
*Last Updated: 2026-02-03 | Gravito Architecture Team*
