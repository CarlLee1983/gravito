# 可觀察性與記憶體管理 👁️

在生產環境中，快取不應是一個「黑盒子」。`@gravito/stasis` 提供了全方位的指標監控與資源保護機制。

---

## 🔒 記憶體保護機制 (Prevention)

記憶體快取（L1）最危險的情況是佔用過多記憶體導致 OOM (Out of Memory)。Stasis 預設採用以下保護：

### 1. LRU 剔除策略
`MemoryStore` 內建 **LRU (Least Recently Used)** 演算法。你可以精確限制每個實例佔用的快取容量：

```typescript
stores: {
  local: { 
    driver: 'memory', 
    maxItems: 5000 // 限制最多儲存 5000 個物件
  }
}
```
當物件數量達到上限時，系統會自動刪除最久未被使用的數據，確保記憶體消耗始終在預控範圍內。

### 2. TTL Lazy Cleanup
過期的資料不會立即被主動掃描（避免 CPU 尖峰），而是在存取時或緩存區滿載時進行清理。

---

## 📊 實時指標 (Observability)

你可以隨時從存儲實例中提取運行數據。這些數據對於診斷瓶頸至關重要：

### 核心指標說明：
*   **Hits (命中次數)**：快取發揮作用的次數。
*   **Misses (未命中次數)**：代表請求必須去資料庫或 Redis 抓取。
*   **Hit Rate (命中率)**：`Hits / (Hits + Misses)`。健康系統通常應高於 70%~80%。
*   **Evictions (剔除數)**：**關鍵指標**。如果該數值快速增長，代表你的 `maxItems` 設定得太小，快取頻繁發生抖動（Thrashing）。

### 如何獲取指標：
```typescript
const stats = cache.store('memory').getStore().getStats();

console.log(`命中率: ${stats.hitRate}`);
console.log(`目前大小: ${stats.size}`);
console.log(`因容量限制被剔除的數據: ${stats.evictions}`);
```

---

## 💡 生產環境最佳實踐

1.  **監控剔除數 (Evictions)**：將 `evictions` 指標匯入 Grafana。如果數值很高，代表你需要增加 `maxItems` 或者縮短 TTL。
2.  **分層配置**：將熱點數據（如配置、Session）放在 L1，將海量數據放在 L2。
3.  **避免大物件**：盡量不要在 `MemoryStore` 中儲存超過 1MB 的單一物件。
