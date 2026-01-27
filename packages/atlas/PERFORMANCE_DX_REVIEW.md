# Atlas 性能與 DX 檢視報告

**日期：** 2026-01-27  
**分支：** feat/atlas-performance-dx-review  
**版本：** @gravito/atlas 1.3.0

---

## 執行摘要

本報告檢視了 `@gravito/atlas` 套件的性能優化機會與開發者體驗（DX）改進空間。經過深入分析，發現了多個可以提升性能與改善開發體驗的領域。

---

## 一、性能優化機會

### 1.1 QueryBuilder Clone 優化 ⚡

**現況：**
- `clone()` 方法立即複製所有陣列（columns, wheres, orders, groups, havings, joins, bindingsList）
- 使用 `ensureOwnState()` 進行延遲複製（copy-on-write），但只在第一次修改時觸發

**問題：**
- 即使不需要修改，clone 也會立即複製所有陣列
- 對於大型查詢（50+ wheres），複製成本較高
- `ensureOwnState()` 的邏輯可以進一步優化

**優化建議：**

1. **改進 copy-on-write 策略**
   ```typescript
   // 當前：clone 時立即複製
   cloned.columns = [...this.columns]
   
   // 建議：使用共享引用 + 標記，只在真正需要時複製
   // 可以減少 50-70% 的 clone 開銷（對於只讀 clone）
   ```

2. **優化陣列複製**
   - 對於大型陣列，考慮使用 `Array.from()` 或 `slice()`（在某些引擎中更快）
   - 對於小型陣列（< 10 元素），直接展開可能更快

3. **添加 clone 性能監控**
   - 在開發模式下追蹤 clone 頻率
   - 提供統計資訊給開發者

**預期提升：** 30-50% clone 性能提升（對於只讀 clone 場景）

---

### 1.2 DirtyTracker 深度比較優化 ⚡

**現況：**
- `isEqual()` 方法使用 JSON.stringify 進行深度比較（當啟用時）
- `cloneValue()` 使用淺層複製

**問題：**
- JSON.stringify 對於大型物件非常慢
- 淺層複製可能導致嵌套物件引用問題

**優化建議：**

1. **改進深度比較算法**
   ```typescript
   // 當前：使用 JSON.stringify（慢）
   if (this.useDeepComparison) {
     return JSON.stringify(a) === JSON.stringify(b)
   }
   
   // 建議：使用結構化比較
   // - 先比較引用
   // - 再比較類型
   // - 最後遞迴比較屬性（避免 JSON.stringify）
   ```

2. **添加比較快取**
   - 對於相同物件的重複比較，可以快取結果
   - 使用 WeakMap 避免記憶體洩漏

3. **優化 cloneValue**
   - 對於已知不可變類型（Date, Map, Set），使用更快的複製方法
   - 考慮使用 structuredClone（如果可用）

**預期提升：** 60-80% 深度比較性能提升

---

### 1.3 Grammar 編譯快取優化 ⚡

**現況：**
- 使用 LRU Cache（max: 500, TTL: 5分鐘）
- 結構化 key 生成使用字串拼接

**問題：**
- Key 生成可能成為瓶頸（大量字串操作）
- Cache hit rate 可能不夠高

**優化建議：**

1. **優化 Key 生成**
   ```typescript
   // 當前：字串拼接
   return [this.constructor.name, query.table, ...].join('_')
   
   // 建議：使用更快的 key 生成
   // - 考慮使用 hash（如 xxhash）
   // - 或使用結構化 key 物件（如果 LRU 支援）
   ```

2. **動態調整 Cache 大小**
   - 根據記憶體使用情況動態調整
   - 提供配置選項讓開發者調整

3. **添加 Cache 統計**
   - 追蹤 hit/miss rate
   - 提供 API 讓開發者查看快取效能

**預期提升：** 10-20% 查詢編譯性能提升

---

### 1.4 Model Hydration 優化 ⚡

**現況：**
- 使用 Proxy 進行屬性存取
- 每次存取都需要遍歷原型鏈

**問題：**
- Proxy handler 中的原型鏈遍歷可能較慢
- 大量屬性存取時，開銷累積

**優化建議：**

1. **快取屬性描述符**
   ```typescript
   // 當前：每次都遍歷原型鏈
   while (proto && proto !== Object.prototype) {
     const descriptor = Object.getOwnPropertyDescriptor(proto, prop)
     // ...
   }
   
   // 建議：使用 WeakMap 快取描述符
   // 減少重複的原型鏈遍歷
   ```

2. **優化 Accessor 查找**
   - 快取 studly case 轉換結果
   - 使用 Map 而非字串操作

3. **批量 Hydration**
   - 對於大量記錄，考慮批量處理
   - 減少 Proxy 建立開銷

**預期提升：** 15-25% 屬性存取性能提升

---

### 1.5 Schema Registry 快取優化 ⚡

**現況：**
- 每個 Model 實例快取 schema
- SchemaRegistry 使用單例模式

**問題：**
- 可能重複查詢相同 table 的 schema
- 沒有全域快取失效機制

**優化建議：**

1. **改進 Schema 快取策略**
   - 使用更積極的快取策略
   - 考慮使用 WeakMap 避免記憶體洩漏

2. **添加 Schema 版本控制**
   - 當 schema 變更時，自動失效快取
   - 提供手動清除快取的 API

**預期提升：** 減少重複 schema 查詢，提升首次查詢後的性能

---

### 1.6 批量操作優化 ⚡

**現況：**
- `insert()` 使用固定 chunk size (1000)
- 對於大量插入，使用 transaction

**問題：**
- Chunk size 可能不是最優的
- 沒有根據資料庫類型調整

**優化建議：**

1. **動態 Chunk Size**
   ```typescript
   // 當前：固定 1000
   const chunkSize = 1000
   
   // 建議：根據資料庫和欄位數量動態調整
   // - PostgreSQL: 可支援更大
   // - SQLite: 可能需要更小
   // - 根據欄位數量計算
   ```

2. **並行處理**
   - 對於非 transaction 場景，考慮並行處理 chunks
   - 使用 Promise.all 提升吞吐量

**預期提升：** 20-40% 批量插入性能提升

---

## 二、開發者體驗（DX）改進

### 2.1 TypeScript 類型改進 📘

**現況：**
- 使用 `any` 類型較多
- 某些方法缺少完整的類型推斷

**改進建議：**

1. **改進 Model 類型推斷**
   ```typescript
   // 建議：使用更精確的類型
   class User extends Model {
     declare id: number
     declare email: string
   }
   
   // 應該能夠推斷出：
   // User.find(1) => Promise<User | null>
   // user.email => string
   ```

2. **改進 QueryBuilder 泛型**
   - 更好的類型推斷支援
   - 減少類型斷言的需求

3. **添加 JSDoc 類型註解**
   - 補充完整的 JSDoc 註解
   - 使用 `@template` 標籤改善泛型文檔

---

### 2.2 錯誤訊息改進 🐛

**現況：**
- 某些錯誤訊息不夠清晰
- 缺少上下文資訊

**改進建議：**

1. **改進 ColumnNotFoundError**
   ```typescript
   // 當前：只顯示欄位名稱
   throw new ColumnNotFoundError(table, key)
   
   // 建議：提供更多上下文
   // - 顯示相近的欄位名稱（使用 Levenshtein）
   // - 顯示可用的欄位列表
   // - 提供修復建議
   ```

2. **改進查詢錯誤**
   - 顯示完整的 SQL 查詢
   - 顯示綁定參數
   - 提供常見錯誤的修復建議

3. **添加錯誤代碼**
   - 為每種錯誤類型添加唯一代碼
   - 方便搜尋和文檔查找

---

### 2.3 開發工具改進 🛠️

**現況：**
- 有 `DB.debug()` 和 `DB.getQueryLog()`
- 有 `console.log` 在 QueryBuilder 中（應該移除）

**改進建議：**

1. **移除生產環境的 console.log**
   ```typescript
   // packages/atlas/src/query/QueryBuilder.ts:1686
   console.log('SQL:', this.toSql())
   console.log('Bindings:', this.getBindings())
   
   // 應該移除或使用 logger
   ```

2. **改進 Query Logging**
   - 使用結構化日誌
   - 支援多種日誌後端（console, file, remote）
   - 添加性能指標（執行時間、記憶體使用）

3. **添加開發模式檢查**
   ```typescript
   // 建議：添加開發模式專用功能
   if (process.env.NODE_ENV === 'development') {
     // 啟用額外的檢查和警告
   }
   ```

4. **添加性能分析工具**
   - 追蹤慢查詢
   - 提供查詢性能報告
   - 識別 N+1 查詢問題

---

### 2.4 文檔改進 📚

**現況：**
- README 有基本文檔
- 缺少詳細的 API 文檔

**改進建議：**

1. **添加完整的 API 文檔**
   - 使用 TypeDoc 或類似工具生成
   - 包含所有公開方法的詳細說明

2. **添加使用範例**
   - 常見使用場景的完整範例
   - 最佳實踐指南
   - 性能優化建議

3. **添加遷移指南**
   - 從其他 ORM 遷移的指南
   - 版本升級指南

---

### 2.5 類型安全改進 🔒

**現況：**
- 某些地方使用 `any` 類型
- 缺少運行時類型檢查

**改進建議：**

1. **減少 `any` 使用**
   - 使用更精確的類型
   - 使用 `unknown` 替代 `any`（需要時）

2. **添加運行時類型驗證**
   - 在開發模式下驗證類型
   - 提供清晰的類型錯誤訊息

3. **改進關係類型推斷**
   - 更好的關係類型推斷
   - 支援嵌套關係類型

---

### 2.6 配置改進 ⚙️

**現況：**
- 配置選項較多，但缺少驗證
   - 缺少配置驗證
   - 錯誤配置可能導致運行時錯誤

**改進建議：**

1. **添加配置驗證**
   ```typescript
   // 建議：在配置時驗證
   DB.configure({
     // 驗證連接配置
     // 提供清晰的錯誤訊息
   })
   ```

2. **改進配置類型**
   - 使用更精確的配置類型
   - 提供配置選項的完整文檔

3. **添加配置預設值**
   - 提供合理的預設值
   - 減少必要的配置選項

---

## 三、優先級建議

### 高優先級（立即實施）

1. **移除生產環境的 console.log** ⚠️
   - 影響：可能洩露敏感資訊
   - 實施難度：低
   - 預期時間：30 分鐘

2. **QueryBuilder Clone 優化** ⚡
   - 影響：顯著提升查詢性能
   - 實施難度：中
   - 預期時間：2-3 小時

3. **改進錯誤訊息** 🐛
   - 影響：大幅改善開發體驗
   - 實施難度：中
   - 預期時間：3-4 小時

### 中優先級（近期實施）

4. **DirtyTracker 深度比較優化** ⚡
   - 影響：提升模型操作性能
   - 實施難度：中高
   - 預期時間：4-6 小時

5. **Model Hydration 優化** ⚡
   - 影響：提升模型存取性能
   - 實施難度：中
   - 預期時間：3-4 小時

6. **TypeScript 類型改進** 📘
   - 影響：改善開發體驗
   - 實施難度：中
   - 預期時間：持續改進

### 低優先級（長期改進）

7. **文檔改進** 📚
   - 影響：改善開發者體驗
   - 實施難度：低
   - 預期時間：持續改進

8. **性能分析工具** 🛠️
   - 影響：幫助開發者優化
   - 實施難度：高
   - 預期時間：1-2 週

---

## 四、實施建議

### 4.1 測試策略

在實施任何優化前，建議：

1. **建立性能基準測試**
   - 使用現有的 `tests/performance/` 測試
   - 確保優化不會導致性能回退

2. **添加回歸測試**
   - 確保功能正確性
   - 覆蓋邊緣情況

3. **進行實際場景測試**
   - 使用真實的資料庫和資料
   - 測試各種使用場景

### 4.2 逐步實施

建議按照優先級逐步實施：

1. **第一階段**（1-2 天）
   - 移除 console.log
   - 改進錯誤訊息
   - 添加基本類型改進

2. **第二階段**（3-5 天）
   - QueryBuilder Clone 優化
   - Model Hydration 優化
   - DirtyTracker 優化

3. **第三階段**（持續）
   - 文檔改進
   - 性能分析工具
   - 其他 DX 改進

---

## 五、結論

`@gravito/atlas` 已經是一個性能優秀的 ORM，但仍有多個可以改進的空間：

1. **性能方面**：主要集中在查詢構建、模型操作和快取策略
2. **DX 方面**：主要集中在類型安全、錯誤處理和開發工具

建議優先實施高優先級項目，這些改進將帶來最大的影響。

---

## 附錄：發現的問題清單

### 代碼品質問題

1. **console.log 在生產代碼中**
   - `packages/atlas/src/query/QueryBuilder.ts:1686-1687`
   - `packages/atlas/src/drivers/SQLiteDriver.ts:212, 223, 234`

2. **註解掉的代碼**
   - `packages/atlas/src/orm/model/Model.ts:1280`
   - `packages/atlas/src/connection/ConnectionManager.ts:207`

### 性能潛在問題

1. **QueryBuilder clone 立即複製所有陣列**
   - 即使不需要修改也會複製

2. **DirtyTracker 使用 JSON.stringify**
   - 對於大型物件可能很慢

3. **Model Proxy 原型鏈遍歷**
   - 每次屬性存取都可能遍歷原型鏈

### DX 問題

1. **錯誤訊息缺少上下文**
   - ColumnNotFoundError 沒有提供建議

2. **類型推斷不夠精確**
   - 某些地方使用 `any`

3. **缺少開發工具**
   - 沒有性能分析工具
   - 沒有 N+1 查詢檢測

---

**報告完成時間：** 2026-01-27
