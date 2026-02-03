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

## 3. 2.0 黑科技：Standalone Engine

在 2.0 中，您可以選擇使用輕量級的 `Gravito Engine`：

- **AOT Router**: 啟動時預編譯路由，靜態路徑達成 O(1) 匹配。
- **FastContext**: 實作內部資源池，將每個請求的記憶體分配降至最低。
- **零拷貝 (Zero-copy)**: 直接橋接 `Bun.serve` 原始 Request，減少中間轉換損耗。

```typescript
import { Gravito } from '@gravito/core/engine'
const app = new Gravito()

app.get('/api/v2/performance', (c) => {
  return c.json({ status: 'warpspeed' })
})
```

## 4. 跨衛星溝通

**情境**: 當訂單支付成功時，通知發票衛星開立發票。

```typescript
// 在 Order Satellite 中 (UseCase)
this.events.emit('order:paid', { orderId: '123' });

// 在 Invoice Satellite 中 (ServiceProvider.boot)
this.events.on('order:paid', (payload) => {
  this.container.make(CreateInvoiceUseCase).execute(payload);
});
```

這種方式確保了 `Order` 與 `Invoice` 在實體層面完全解耦。

---
*Last Updated: 2026-02-03 | Gravito Architecture Team*
