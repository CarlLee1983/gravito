# 故障排除指南

本文檔記錄了開發環境無法正常瀏覽的問題修復經驗，旨在防止類似問題再次發生。

## 📋 問題概述

**症狀**：運行 `bun run dev` 後，網站無法正常瀏覽，前端資源（如 `/app.tsx`、`/@vite/client`、`/styles.css`）返回 404 錯誤。

**根本原因**：多個系統性問題導致 Vite 開發伺服器的代理無法正常工作。

---

## 🔍 關鍵問題與修復

### 1. Middleware 執行順序問題

**問題**：Gravito Engine 的 `fetch` 方法先執行路由匹配，再執行 middleware，導致 Vite proxy middleware 無法攔截請求。

**修復**：修改 `packages/core/src/engine/Gravito.ts`，確保全局 middleware 在路由匹配之前執行。

**關鍵代碼**：
```typescript
// 執行順序：Middleware → 路由匹配
const globalMiddleware = this.router.collectMiddlewarePublic(path, [])
if (globalMiddleware.length > 0) {
  // 先執行 middleware
  // 如果 middleware 返回 Response，直接返回，不進行路由匹配
}
```

**預防措施**：
- ✅ 確保所有需要攔截請求的 middleware（如 proxy、認證）註冊為全局 middleware
- ✅ 在 `bootstrap.ts` 中，將 proxy setup 放在路由註冊之前

---

### 2. Bootstrap 順序問題

**問題**：`setupViteProxy` 在 `registerRoutes` 之後調用，導致路由已註冊，middleware 無法攔截。

**修復**：在 `src/bootstrap.ts` 中調整順序：

```typescript
// ✅ 正確順序
// 1. Setup Vite Proxy (必須在路由之前)
if (process.env.NODE_ENV !== 'production') {
  setupViteProxy(core)
}

// 2. Register Routes (在 proxy 之後)
registerRoutes(core)
```

**預防措施**：
- ✅ 在 `bootstrap.ts` 中明確註釋執行順序
- ✅ 使用代碼審查檢查 middleware 和路由的註冊順序

---

### 3. '*' 模式處理問題

**問題**：`AOTRouter.usePattern('*', ...)` 沒有將 `'*'` 識別為全局 middleware，導致無法在所有請求之前執行。

**修復**：修改 `packages/core/src/engine/AOTRouter.ts`：

```typescript
usePattern(pattern: string, ...middleware: Middleware[]): void {
  // Special case: '*' pattern should be treated as global middleware
  if (pattern === '*') {
    this.globalMiddleware.push(...middleware)
  } else {
    // 路徑特定的 middleware
    const existing = this.pathMiddleware.get(pattern) ?? []
    this.pathMiddleware.set(pattern, [...existing, ...middleware])
  }
  this.version++
}
```

**預防措施**：
- ✅ 明確區分全局 middleware（`'*'`）和路徑 middleware
- ✅ 在文檔中說明 `'*'` 模式的特殊處理

---

### 4. CSS Content-Type 處理問題

**問題**：在開發模式下，Vite 會將 CSS import 轉換為 JavaScript 模組（用於 HMR），但 proxy 強制設置 `Content-Type: text/css`，導致瀏覽器報錯。

**錯誤訊息**：
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/css".
```

**修復**：修改 `src/utils/vite.ts`，保留 Vite 的原始 Content-Type：

```typescript
if (isCSS) {
  // 在 Vite dev mode，CSS imports 被轉換為 JS modules with HMR
  // 所以應該保留 Vite 的原始 Content-Type（通常是 text/javascript）
  const originalContentType = response.headers.get('content-type')
  if (!originalContentType || 
      (!originalContentType.includes('javascript') && 
       !originalContentType.includes('css'))) {
    // 只有在 Vite 沒有提供有效類型時才使用 fallback
    responseHeaders.set('Content-Type', 'text/javascript')
  }
  // 否則保留 Vite 的 Content-Type
}
```

**預防措施**：
- ✅ 理解 Vite 在開發模式下的行為（CSS → JS 模組轉換）
- ✅ 不要盲目覆蓋 Content-Type，優先保留上游服務的設置

---

### 5. 端口衝突問題

**問題**：舊的開發伺服器進程佔用端口（3000、5174），導致新進程無法啟動。

**修復**：
1. 創建 `scripts/clean-port.ts` 腳本自動清理端口
2. 在 `package.json` 中使用 `predev` hook：

```json
{
  "scripts": {
    "predev": "bun run clean:ports",
    "dev": "bun run dev:vite & bun run dev:server",
    "clean:ports": "bun scripts/clean-port.ts 5174; bun scripts/clean-port.ts 3000"
  }
}
```

**預防措施**：
- ✅ 使用 `predev` hook 自動清理端口
- ✅ `clean-port.ts` 必須排除當前進程和父進程，避免殺掉自己

---

### 6. next() 函數檢查

**問題**：在某些情況下 `next` 可能是 `undefined`，導致 `TypeError: next is not a function`。

**修復**：在所有 middleware 中添加檢查：

```typescript
if (next) {
  return await next()
}
return undefined
```

**預防措施**：
- ✅ 始終檢查 `next` 是否存在再調用
- ✅ 使用 TypeScript 類型確保 `next` 的類型正確

---

## ✅ 檢查清單

在設置新的開發環境或修改 bootstrap 邏輯時，請確認：

- [ ] `setupViteProxy` 在 `registerRoutes` **之前**調用
- [ ] 全局 middleware（使用 `'*'` 模式）正確註冊到 `globalMiddleware`
- [ ] Gravito Engine 的 `fetch` 方法先執行 middleware，再進行路由匹配
- [ ] CSS 文件的 Content-Type 在開發模式下保留 Vite 的設置
- [ ] `package.json` 中有 `predev` hook 清理端口
- [ ] 所有 middleware 中都有 `if (next)` 檢查
- [ ] Vite 配置中 `strictPort: true` 確保端口一致性

---

## 🚨 常見錯誤模式

### 錯誤 1：將 proxy 放在路由之後

```typescript
// ❌ 錯誤
registerRoutes(core)
setupViteProxy(core)  // 太晚了！
```

### 錯誤 2：使用 `app.all()` 而不是 `app.use()`

```typescript
// ❌ 錯誤 - app.all() 是路由處理器，不是 middleware
app.all('*', async (c, next) => { ... })

// ✅ 正確 - app.use() 註冊為 middleware
app.use('*', async (c, next) => { ... })
```

### 錯誤 3：強制覆蓋 CSS Content-Type

```typescript
// ❌ 錯誤 - 破壞了 Vite 的 HMR
if (isCSS) {
  responseHeaders.set('Content-Type', 'text/css')
}

// ✅ 正確 - 保留 Vite 的設置
if (isCSS) {
  const originalContentType = response.headers.get('content-type')
  // 只在必要時才覆蓋
}
```

---

## 📚 相關文件

- `src/bootstrap.ts` - 應用程式啟動邏輯
- `src/utils/vite.ts` - Vite proxy 設置
- `packages/core/src/engine/Gravito.ts` - Gravito Engine 核心
- `packages/core/src/engine/AOTRouter.ts` - 路由與 middleware 管理
- `scripts/clean-port.ts` - 端口清理腳本

---

## 💡 最佳實踐

1. **執行順序很重要**：Middleware → Proxy → Routes
2. **理解工具行為**：Vite 在開發模式下會轉換 CSS 為 JS 模組
3. **自動化端口管理**：使用 `predev` hook 避免手動清理
4. **類型安全**：使用 TypeScript 確保 `next` 函數的類型正確
5. **文檔化**：在關鍵位置添加註釋說明執行順序和原因

---

**最後更新**：2026-01-23  
**修復版本**：v0.1.7
