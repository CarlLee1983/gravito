# @gravito/radiance 優化改進計劃

> **建立日期**: 2025-01-25
>
> 本文件詳細說明 `@gravito/radiance` 套件的優化改進計劃，基於完整的代碼審查分析結果。

---

## 執行摘要

| 優化項目 | 當前狀態 | 優先級 | 預期影響 |
|---------|---------|--------|---------|
| PusherDriver MD5 實現改進 | ⏳ 待處理 | 🔴 緊急 | 安全性與標準合規 |
| WebSocketDriver 日誌系統整合 | ⏳ 待處理 | 🟡 重要 | 可觀測性 |
| OrbitRadiance 測試覆蓋率提升 | ⏳ 待處理 | 🟡 重要 | 穩定性 |
| README.zh-TW.md 內容完善 | ⏳ 待處理 | 🟢 改進 | 開發者體驗 |
| JSDoc 文檔增強 | ⏳ 待處理 | 🟢 改進 | 開發者體驗 |
| 效能最佳化文檔 | ⏳ 待處理 | 🟢 改進 | 文檔完整性 |

**當前代碼品質評分**: 8.5/10
**目標代碼品質評分**: 9.5/10

---

## 當前狀態分析

### 優勢

| 項目 | 評分 | 說明 |
|------|------|------|
| 測試覆蓋率 | 99.68% | 極高的行覆蓋率，超越 80% 目標 |
| 多驅動支援 | 4 種 | Pusher、Ably、Redis、WebSocket |
| 框架整合 | 優秀 | 與 Gravito 核心無縫整合 |
| 類型定義 | 完整 | 所有 API 都有明確的 TypeScript 類型 |
| 輕量設計 | 優秀 | 無外部依賴（除 @gravito/core） |

### 待改進領域

| 項目 | 當前狀態 | 問題描述 |
|------|---------|---------|
| MD5 實現 | 簡化版本 | PusherDriver 使用非標準 MD5 實現 |
| 錯誤日誌 | console.error | WebSocketDriver 未整合日誌系統 |
| 函數覆蓋 | 80% | OrbitRadiance 函數覆蓋率可提升 |
| 中文文檔 | 基礎版本 | README.zh-TW.md 內容不完整 |

---

## 🔴 Phase 1: 關鍵問題修復（緊急）

### 1.1 PusherDriver MD5 實現改進

**問題描述**：
當前 PusherDriver 使用簡化版的 MD5 實現，可能在邊界情況下產生錯誤的雜湊值。Pusher API 要求對請求 body 進行 MD5 校驗，若雜湊值不正確會導致 API 請求失敗。

**當前實現**（位於 `src/drivers/PusherDriver.ts`）：
```typescript
// 簡化版 MD5 實現（生產環境應使用專用庫）
private md5(str: string): string {
  // ... 簡化實現
}
```

**建議改進**：
1. 使用 Bun 內建的 `Bun.CryptoHasher` 或 Web Crypto API
2. 或整合標準的 MD5 實現

**改進方案**：
```typescript
private md5(str: string): string {
  const hasher = new Bun.CryptoHasher('md5')
  hasher.update(str)
  return hasher.digest('hex')
}
```

**驗證標準**：
- [ ] 與標準 MD5 實現的輸出完全一致
- [ ] 通過所有 Pusher API 整合測試
- [ ] 邊界情況測試（空字串、Unicode、大型 payload）

---

### 1.2 WebSocketDriver 日誌系統整合

**問題描述**：
WebSocketDriver 在發送失敗時使用 `console.error` 記錄錯誤，這不符合框架的日誌系統規範，也無法進行集中化的日誌管理。

**當前實現**（位於 `src/drivers/WebSocketDriver.ts`）：
```typescript
async broadcast(channel: string, event: string, data: unknown): Promise<void> {
  // ...
  try {
    this.socket.send(message)
  } catch {
    console.error(`[WebSocketDriver] Failed to send message to channel: ${channel}`)
  }
}
```

**建議改進**：
1. 接受可選的 Logger 實例
2. 若無 Logger，則靜默失敗或使用預設行為
3. 記錄更結構化的錯誤資訊

**改進方案**：
```typescript
interface WebSocketDriverConfig {
  socket: WebSocket
  filterByChannel?: boolean
  logger?: Logger // 新增可選 Logger
}

async broadcast(channel: string, event: string, data: unknown): Promise<void> {
  // ...
  try {
    this.socket.send(message)
  } catch (error) {
    this.logger?.warn('WebSocket broadcast failed', {
      channel,
      event,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
```

**驗證標準**：
- [ ] 無 Logger 時不會拋出錯誤
- [ ] 有 Logger 時正確記錄警告
- [ ] 錯誤資訊包含足夠的診斷資訊

---

## 🟡 Phase 2: 重要改進

### 2.1 OrbitRadiance 測試覆蓋率提升

**當前狀態**：
- 行覆蓋率：97.78%
- 函數覆蓋率：80%

**待補充測試**：
1. `install()` 方法的所有驅動類型分支
2. EventManager 整合的邊界情況
3. Redis 客戶端注入失敗的處理

**測試案例清單**：
```typescript
// tests/orbit-radiance.test.ts 新增測試
describe('OrbitRadiance edge cases', () => {
  it('should handle missing Redis client gracefully', async () => {
    // 測試 Redis 驅動在無客戶端時的行為
  })

  it('should integrate with EventManager for ShouldBroadcast events', async () => {
    // 測試事件廣播整合
  })

  it('should skip non-ShouldBroadcast events', async () => {
    // 測試普通事件不觸發廣播
  })
})
```

**驗證標準**：
- [ ] 函數覆蓋率達到 95%+
- [ ] 所有邊界情況都有對應測試
- [ ] 測試執行時間維持在 100ms 以內

---

### 2.2 驅動程式錯誤處理統一

**問題描述**：
各驅動程式的錯誤處理方式不一致，部分驅動會拋出錯誤，部分則靜默失敗。

**當前狀態**：
| 驅動 | 網路錯誤處理 | 授權錯誤處理 |
|------|-------------|-------------|
| PusherDriver | 拋出錯誤 | 拋出錯誤 |
| AblyDriver | 拋出錯誤 | 拋出錯誤 |
| RedisDriver | 拋出錯誤 | N/A |
| WebSocketDriver | 靜默失敗 | N/A |

**建議改進**：
1. 統一錯誤處理策略
2. 提供可配置的錯誤處理選項
3. 文檔化各驅動的錯誤行為

---

## 🟢 Phase 3: 優化改進（持續）

### 3.1 README.zh-TW.md 內容完善

**當前狀態**：僅有基礎的快速開始範例

**待補充內容**：
- [ ] 所有驅動程式的配置範例（Pusher、Ably、Redis、WebSocket）
- [ ] 通道類型詳細說明（Public、Private、Presence）
- [ ] 通道授權機制說明
- [ ] 與 Gravito EventManager 整合範例
- [ ] ShouldBroadcast 介面實現範例
- [ ] 疑難排解（Troubleshooting）
- [ ] API 快速參考

**預期結構**：
```markdown
# @gravito/radiance

## 功能特色
## 安裝
## 快速開始
## 驅動配置
  - Pusher
  - Ably
  - Redis
  - WebSocket
## 通道類型
  - 公開通道
  - 私有通道
  - 存在通道
## 通道授權
## 事件廣播
  - ShouldBroadcast 介面
  - 自訂事件名稱
## API 參考
## 疑難排解
```

---

### 3.2 JSDoc 文檔增強

**待強化項目**：

1. **BroadcastManager.ts**：
   - 添加 `@throws` 說明
   - 添加完整的使用範例
   - 補充授權流程說明

2. **各驅動程式**：
   - 添加配置選項的詳細說明
   - 添加效能特徵說明
   - 添加限制與注意事項

3. **OrbitRadiance.ts**：
   - 添加 Orbit 生命週期說明
   - 添加與 EventManager 整合的範例

**範例格式**：
```typescript
/**
 * 廣播事件至指定通道
 *
 * @param event - 觸發廣播的事件實例
 * @param channel - 目標通道（含類型前綴，如 'private-orders'）
 * @param data - 要廣播的資料
 * @param eventName - 事件名稱（預設為事件類名）
 *
 * @throws {Error} 當驅動程式未設置時拋出
 * @throws {Error} 當驅動程式廣播失敗時拋出
 *
 * @example
 * ```typescript
 * await manager.broadcast(
 *   orderEvent,
 *   'private-orders.123',
 *   { status: 'shipped' },
 *   'OrderShipped'
 * )
 * ```
 */
async broadcast(...): Promise<void>
```

---

### 3.3 效能最佳化文檔

**待補充內容**：

1. **驅動選擇指南**：
   | 場景 | 推薦驅動 | 原因 |
   |------|---------|------|
   | 高併發 | Pusher/Ably | 託管服務，自動擴展 |
   | 內部微服務 | Redis | 低延遲，無外部依賴 |
   | 單節點開發 | WebSocket | 簡單設置 |

2. **效能調校建議**：
   - Pusher：批次廣播限制
   - Redis：連接池配置
   - WebSocket：訊息壓縮

3. **監控指標**：
   - 廣播延遲
   - 失敗率
   - 通道數量

---

## 驗證命令

```bash
cd packages/radiance

# 執行測試
bun test

# 檢查覆蓋率
bun test --coverage

# 類型檢查
bun run typecheck

# 構建驗證
bun run build
```

---

## 時程規劃

### 第一階段（緊急）
- [ ] PusherDriver MD5 實現改進
- [ ] WebSocketDriver 日誌系統整合
- [ ] 新增對應的單元測試

### 第二階段（重要）
- [ ] OrbitRadiance 測試覆蓋率提升至 95%+
- [ ] 驅動程式錯誤處理統一
- [ ] 新增整合測試

### 第三階段（持續改進）
- [ ] README.zh-TW.md 完整重寫
- [ ] JSDoc 文檔增強
- [ ] 效能最佳化文檔撰寫
- [ ] 新增效能基準測試

---

## 相關文件參考

| 文件 | 用途 | 行數 |
|------|------|------|
| `src/index.ts` | 公開 API 導出 | 21 |
| `src/BroadcastManager.ts` | 廣播核心管理器 | 72 |
| `src/OrbitRadiance.ts` | Gravito 整合模組 | 96 |
| `src/channels/Channel.ts` | 通道類型定義 | 36 |
| `src/drivers/*.ts` | 驅動程式實現 | ~400 |
| `tests/*.test.ts` | 測試套件 | ~300 |

---

## 結論

`@gravito/radiance` 是一個設計良好的廣播系統套件，具有極高的測試覆蓋率（99.68%）和完整的多驅動支援。本優化計劃專注於：

1. **關鍵修復**：改進 MD5 實現以確保 Pusher API 相容性
2. **可觀測性**：整合框架日誌系統
3. **測試完整性**：提升函數覆蓋率
4. **開發者體驗**：完善中文文檔與 JSDoc

完成所有優化後，預期代碼品質評分可從 **8.5/10** 提升至 **9.5/10**。
