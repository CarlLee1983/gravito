# Signal: The Messaging & Email Orbit

**Version**: 3.0.4
**Module**: `@gravito/signal`
**Focus**: Multi-driver Email, Event Bus, Template Rendering

---

## 1. 核心概念 (Core Concepts)

Signal 是 Gravito 的通訊中樞。它同時扮演了 **郵件框架** 與 **進程內事件總線** 的角色，旨在簡化異步通知與跨領域通訊。

---

## 2. 郵件系統 (Mail System)

Signal 採用了「Mailable」對象模式，將郵件的內容與發送邏輯封裝在一起。

### 2.1 渲染引擎 (Renderers)
Signal 支援多種視圖引擎，讓開發者能用熟悉的語法編寫郵件：
*   **Prism**: Gravito 預設的高效能視圖引擎。
*   **React/Vue**: 直接使用前端組件渲染郵件。
*   **Mjml**: 內置 MJML 支援，確保郵件在不同客戶端（Outlook, Gmail）的一致性。

### 2.2 傳輸驅動 (Transports)
*   **SMTP**: 標準郵件發送。
*   **SES**: 整合 AWS Simple Email Service。
*   **Log/Memory**: 開發環境專用，不實際發送郵件。

### 2.3 開發者體驗 (Dev UI)
開啟 `devMode` 後，所有郵件會被攔截到 `/__mail`。這是一個內置的 Web UI，可直接預覽郵件渲染效果、檢查連結與附件。

---

## 3. 事件總線 (Event Bus)

除了郵件，Signal 也提供輕量級的事件訂閱機制。

*   **跨領域解耦**: Satellite 可以發布事件而不必知道誰在監聽。
*   **類型安全**: 透過泛型定義事件與 Payload，確保處理過程不發生類型錯誤。

---

## 4. 異步傳送 (Queued Messaging)

Signal 與 `@gravito/stream` 深度整合。

```typescript
// 將郵件放入隊列，由後台 Worker 發送
await email.onQueue('emails').delay(300).queue();
```

這能顯著降低 Web 請求的響應時間，並提供自動重試機制。
