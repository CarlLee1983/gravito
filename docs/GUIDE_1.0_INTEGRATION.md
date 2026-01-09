# 🏗️ Gravito 1.0 架構整合指南

本文檔解釋 Gravito 如何在單體應用中維持 **DDD (Domain-Driven Design)** 與 **Clean Architecture** 的嚴謹性，同時提供極簡的開發體驗。

## 1. 核心概念：Orchestrated Monolith
Gravito 採用「協調式單體」架構。每個衛星 (Satellite) 都是一個獨立的 **Bounded Context**。

### 模組邊界守則
- **禁止直接引用**: `Order` 模組絕對不能直接 `import` `Catalog` 的 Repository。
- **依賴注入**: 所有基礎設施（DB, Cache, Mail）都透過核心框架注入到衛星的 `ServiceProvider` 中。
- **事件驅動**: 跨邊界通訊必須透過領域事件（Domain Events）。

## 2. 啟動引擎：GravitoServer
`GravitoServer` 是內化於核心的組裝引擎。它的運作流程如下：

1.  **讀取 Manifest**: 獲取開發者想要的功能清單。
2.  **動態解析 (Resolving)**: 透過應用層提供的 `ModuleResolver` 映射表載入對應的套件。
3.  **ServiceProvider 點火**: 
    - 呼叫 `register()`: 衛星將自己的 UseCases 與 Repositories 註冊進 IoC 容器。
    - 呼叫 `boot()`: 衛星掛載路由、註冊事件監聽器。

## 3. 管理端整合：IAdminModule
UI 層級的整合透過 `IAdminModule` 介面實現。每個 `@gravito/admin-ui-*` 套件都會導出一個 UI 定義物件，包含：
- **Routes**: 該模組專屬的 React 頁面。
- **NavItems**: 應該出現在側邊欄的按鈕。
- **Widgets**: 可以被嵌入到數據儀表板的小工具。

## 4. 跨模組溝通範例
**情境**: 當訂單支付成功時，需要通知發票模組開立發票。

```typescript
// 在 Order 衛星中
this.core.make(OrbitSignal).dispatch('order.paid', { orderId: '123' });

// 在 Invoice 衛星中 (boot 方法)
this.core.make(OrbitSignal).listen('order.paid', (payload) => {
  this.container.make(CreateInvoiceUseCase).execute(payload);
});
```

這種方式確保了 `Order` 與 `Invoice` 在代碼層級完全解耦，即便未來將 `Invoice` 拆分為微服務，邏輯也無需大幅修改。
