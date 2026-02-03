# 📡 Gravito Cross-Satellite Communication Specification (GCCS)

本文件定義了 Gravito 生態系中衛星模組（Satellite）之間的通訊標準，旨在實現高內聚、低耦合的 **Galaxy Architecture**。

## 1. 通訊哲學 (Philosophy)

衛星之間應避免直接的類別依賴（Class Dependency）。所有的跨模組互動應優先透過以下層次進行：
1.  **Actions (核心掛鉤)**: 適用於需要同步或立即執行的副作用。
2.  **Signal (事件總線)**: 適用於領域事件（Domain Events）與跨模組異步通訊。
3.  **Interfaces (介面調用)**: 僅限於透過 IoC 容器解析的合約。

## 2. 掛鉤命名規範 (Hook Naming)

掛鉤名稱必須具備命名空間，遵循以下格式：
`[satellite-name]:[action]`

### 2.1 動作範例 (Actions)
- `membership:registered`: 當新用戶完成註冊時觸發。
- `order:created`: 當新訂單建立時觸發。
- `payment:succeeded`: 當支付成功時觸發。

### 2.2 過濾器範例 (Filters)
- `catalog:product-price`: 允許其他模組（如折扣模組）修改產品價格顯示。
- `cart:validate-item`: 允許其他模組對購物車項目進行額外驗證。

## 3. 事件 Schema 標準 (Event Schema)

為了確保通訊的穩定性，所有透過 `Signal` 發送的事件 Payload 必須包含以下標準欄位：

```typescript
{
  "eventId": "uuid",
  "occurredAt": "iso-8601-timestamp",
  "version": "1.0",
  "payload": {
    // 業務相關數據
  },
  "metadata": {
    "source": "membership-satellite",
    "traceId": "correlation-id"
  }
}
```

## 4. 異步與保證 (Async & Reliability)

### 4.1 非阻塞原則
跨模組的副作用應預設為非阻塞。若該動作涉及外部服務（如發信、Webhooks），必須使用 `OrbitStream` 進入隊列。

### 4.2 失敗重試
對於關鍵的跨模組通訊（如支付完成後的授權），消費方（Consumer）應實作等冪性（Idempotency）邏輯，以應對事件重複發送或失敗重試。

## 5. 禁止行為 (Anti-Patterns)

- **禁止直接引用**: 衛星 A 的 `Application` 層嚴禁直接 `import` 衛星 B 的類別。
- **禁止共享資料庫**: 衛星 A 嚴禁直接透過 Atlas 操作衛星 B 的私有資料表。必須透過衛星 B 暴露的介面或事件進行互動。
- **禁止循環依賴**: 若出現衛星 A 依賴 B，且 B 依賴 A 的情況，說明領域劃分存在問題，應重新考慮將共用邏輯提取至新的衛星或核心 Orbit。

---
*Created by Gravito Architecture Group.*
