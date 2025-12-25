# 中間件 (Middleware)

中間件提供了一種方便的機制來檢查並過濾進入應用程式的 HTTP 請求。例如，Gravito 包含一個驗證使用者身份的中間件。

## 定義中間件

中間件是一個函式，接收 `Context` 和一個 `next` 函式。

```typescript
import { GravitoMiddleware } from 'gravito-core';

export const logger: GravitoMiddleware = async (c, next) => {
  const start = Date.now();
  
  // 執行鏈中的下一個處理程序
  await next();
  
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`);
};
```

## 註冊中間件

### 在路由中註冊

您可以將中間件分配給特定的路由：

```typescript
routes.get('/profile', logger, [UserController, 'profile']);
```

### 在群組中註冊

您也可以為一組路由分配中間件：

```typescript
routes.middleware(logger).group((group) => {
  group.get('/', [HomeController, 'index']);
  group.get('/about', [HomeController, 'about']);
});
```

### 全域中間件

若要讓中間件在應用程式的每個請求中執行，請在 `PlanetCore` 初始化時使用 `adapter.useGlobal`：

```typescript
// src/bootstrap.ts
core.adapter.useGlobal(logger);
```

## 中間件參數

中間件可以接收額外的參數。通常我們透過建立一個傳回中間件函式的工廠函式來實現：

```typescript
export function restrictTo(role: string): GravitoMiddleware {
  return async (c, next) => {
    const user = c.get('user');
    
    if (user?.role !== role) {
      return c.forbidden('您沒有權限存取此資源');
    }
    
    await next();
  };
}

// 使用方式
routes.get('/admin', restrictTo('admin'), [AdminController, 'index']);
```
