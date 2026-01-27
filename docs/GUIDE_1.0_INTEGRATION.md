# 🏗️ Gravito 1.0 架構整合指南

本文檔解釋 Gravito 如何在單體應用中維持 **DDD (Domain-Driven Design)** 與 **Clean Architecture** 的嚴謹性，同時透過 **銀河架構 (Galaxy Architecture)** 提供極簡的組裝體驗。

## 1. 核心概念：Galaxy Architecture
Gravito 採用「銀河架構」。系統由三個核心組件構成：

- **PlanetCore (@gravito/core)**: 引力中心，負責 IoC 容器與生命週期。
- **Orbits (基礎設施)**: 圍繞核心的戰略擴展（如 `OrbitAtlas`, `OrbitIon`）。
- **Satellites (領域衛星)**: 獨立的 **Bounded Context**（如 `Catalog`, `Order`）。

### 模組邊界守則
- **禁止直接引用**: `Order` 衛星絕對不能直接 `import` `Catalog` 的 Repository 或 Entity。
- **Use Cases 封裝**: 所有跨衛星調用應透過 Use Cases 或領域事件。
- **依賴注入**: 透過 `c.get()` 或 `container.make()` 取用共享資源。

## 2. 啟動引擎：Manifest-Driven Development (MDD)
Gravito 1.0 推崇「清單驅動開發」。

1.  **宣告 Manifest**: 在 `gravito.config.ts` 中宣告所需的功能。
2.  **自動掛載 (Auto-mounting)**: 核心會自動掃描 Satellites 並執行其 `ServiceProvider`。
3.  **生命週期點火**: 
    - `register()`: 註冊 UseCases 與服務。
    - `boot()`: 掛載路由、註冊事件監聽器。

## 3. 跨衛星溝通
**情境**: 當訂單支付成功時，通知發票衛星開立發票。

```typescript
// 在 Order Satellite 中 (UseCase)
this.events.emit('order:paid', { orderId: '123' });

// 在 Invoice Satellite 中 (ServiceProvider.boot)
this.events.on('order:paid', (payload) => {
  this.container.make(CreateInvoiceUseCase).execute(payload);
});
```

這種方式確保了 `Order` 與 `Invoice` 完全解耦。
