# Cosmos Architecture: The Internationalization Orbit

**Version**: 1.0.0
**Module**: `@gravito/cosmos`
**Focus**: i18n, Localization, Context Injection

---

## 1. 核心設計 (Core Design)

Cosmos 是 Gravito 框架中的標準 **i18n (國際化)** 解決方案。它並非以 Service Provider 形式存在，而是作為一個 **Orbit (軌道)**。

### 什麼是 Orbit?
Orbit 是 Gravito 擴展生態系中的一種高層級插件，它擁有完整的生命週期權限，可以：
1.  註冊中間件 (Middleware)。
2.  擴展請求上下文 (Context Extension)。
3.  執行啟動時的初始化邏輯 (e.g., Load files)。

---

## 2. 翻譯管線 (Translation Pipeline)

Cosmos 的翻譯查找過程遵循以下管線，確保了最大的彈性與容錯率。

```mermaid
flowchart TD
    Call[t('auth.errors.failed', { user: 'Carl' })] --> LookupCurrent{Exist in Current Locale?}
    
    LookupCurrent -- Yes --> FetchValue[Get Value]
    LookupCurrent -- No --> CheckFallback{Is Current == Default?}
    
    CheckFallback -- No --> LookupDefault{Exist in Default Locale?}
    CheckFallback -- Yes --> ReturnKey[Return Key String]
    
    LookupDefault -- Yes --> FetchValue
    LookupDefault -- No --> ReturnKey
    
    FetchValue --> Interpolate[Replace Parameters]
    Interpolate --> Result([Final String])
```

### 關鍵機制
*   **Dot Notation**: 支援 `auth.errors.failed` 這種深層嵌套的 JSON 結構查找。
*   **Graceful Fallback**: 若目標語系 (e.g., `zh-TW`) 缺失某個 Key，會自動嘗試從 `defaultLocale` (e.g., `en`) 獲取，避免介面上出現原始 Key 值。
*   **Interpolation**: 支援 `:param` 風格的參數替換 (e.g., `Welcome :name`).

---

## 3. 上下文注入 (Context Injection)

Cosmos 利用 Gravito Core 的適配器機制，將 `I18nManager` 實例注入到每個請求的 Context 中。

```typescript
// 內部實作
core.adapter.use('*', async (c, next) => {
  // 每個請求共享同一個 Manager 實例，但可能有不同的 Locale 狀態 (需注意)
  // *註: 目前實作中 Locale 是 Manager 的屬性，這在單例模式下會有併發問題。
  // 未來版本將改為 Per-Request State。
  c.set('i18n', i18n); 
  await next();
});
```

**開發者體驗 (DX)**:
開發者可以在 Controller 中直接解構使用：

```typescript
app.get('/', ({ i18n }) => {
  return i18n.t('welcome');
});
```

---

## 4. 資源加載器 (Resource Loader)

Cosmos 包含一個基於 Node.js `fs/promises` 的輕量級加載器。

*   **Flat Structure**: 目前支援根目錄下的 `locale.json` (e.g., `en.json`, `zh.json`)。
*   **Async Loading**: 在 Orbit 安裝階段 (`install`) 非同步讀取所有語言檔並緩存於記憶體中，確保 Runtime 查找效能為 O(1)。

---

## 5. 待優化項目 (Future Improvements)

基於目前的代碼分析，我們識別出以下改進空間：
1.  **Scope Isolation**: 目前 `I18nManager` 是一個單例，`setLocale` 會修改全域狀態。在併發請求下，Request A 的 Locale 可能會被 Request B 覆蓋。需改為 **Clone-per-request** 模式。
2.  **Performance**: 對於超大型語言包，可以引入 Lazy Loading 機制。
