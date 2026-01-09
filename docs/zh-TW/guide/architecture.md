---
title: 架構概覽 (Architecture Overview)
description: 了解 Gravito 的核心架構，包含 IoC 容器、服務提供者與請求生命週期。
---

# 架構概覽 (Architecture Overview)

> Gravito 採用「微內核 + 軌道 (Orbit)」的銀河架構，提供極致的擴展性與解耦能力。

## 請求生命週期 (Request Lifecycle)

當請求進入 Gravito 應用程式時，會經過以下階段：

1.  **啟動 (Liftoff)**：Bun 啟動伺服器並將請求交給 `PlanetCore`。
2.  **核心中間件 (Global Middleware)**：處理 CSRF、Session、日誌等全域任務。
3.  **路由匹配 (Routing)**：尋找對應的控制器或處理函式。
4.  **路由中間件 (Route Middleware)**：執行特定的驗證或授權檢查。
5.  **執行處理函式 (Controller/Handler)**：運算並生成回應。
6.  **傳回回應 (Response)**：核心將數據發送回客戶端。

## IoC 容器 (Service Container)

IoC（控制反轉）容器是管理類別依賴與依賴注入的強大工具。

### 綁定服務

您可以在服務提供者中綁定服務：

```typescript
// 暫時性綁定 (每次解析都重新建立)
container.bind('sms', () => new TwilioSms());

// 單例綁定 (應用程式生命週期內只建立一次)
container.singleton('cache', () => new RedisCache());
```

### 解析服務

```typescript
const cache = container.make('cache');
```

## 服務提供者 (Service Providers)

服務提供者是 Gravito 應用程式啟動的中心點。您的應用程式以及所有 Gravito 核心服務都是透過服務提供者引導的。

### 定義提供者

```typescript
import { ServiceProvider, Container } from '@gravito/core';

export class AppServiceProvider extends ServiceProvider {
  /**
   * 註冊服務綁定
   */
  register(container: Container) {
    container.singleton('stats', () => new AnalyticsService());
  }

  /**
   * 在所有服務註冊完成後執行
   */
  async boot() {
    console.log('應用程式已就緒');
  }
}
```

### 註冊提供者

在 `PlanetCore` 初始化時註冊：

```typescript
const core = new PlanetCore();
core.register(new AppServiceProvider());
```

---

## 下一步
了解如何透過 [Pulse CLI](./pulse-cli.md) 加速您的開發。
