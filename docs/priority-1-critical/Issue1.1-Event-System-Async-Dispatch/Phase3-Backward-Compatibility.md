# Phase 3: 向後兼容性測試

**週期**：Week 5-6
**任務數**：5 個
**測試覆蓋**：完整遷移驗證
**預期交付物**：遷移指南 + 驗證報告

---

## 📋 任務清單

### ✅ Task 1.1.3.1: 編寫兼容性測試套件

**檔案**：`packages/core/tests/HookManager.compatibility.test.ts`

**目標**：
確保舊 API（同步）和新 API（異步）都能正常工作

**詳細需求**：

```typescript
describe('HookManager - Backward Compatibility', () => {
  // 測試 1: 純同步監聽器（向後兼容）
  describe('Sync listeners (backward compatible)', () => {
    it('should execute sync listener with legacy API', async () => {
      const results = []

      core.hooks.addAction('test:event', () => {
        results.push('sync')
      })

      // 使用舊 API（同步）
      await core.hooks.doAction('test:event')

      expect(results).toEqual(['sync'])
    })

    it('should execute multiple sync listeners in order', async () => {
      const results = []

      core.hooks.addAction('test:event', () => results.push('listener1'))
      core.hooks.addAction('test:event', () => results.push('listener2'))

      await core.hooks.doAction('test:event')

      expect(results).toEqual(['listener1', 'listener2'])
    })
  })

  // 測試 2: 混合監聽器（自動降級）
  describe('Mixed listeners (automatic fallback)', () => {
    it('should use async mode when listener is async', async () => {
      const results = []

      core.hooks.addAction('test:event', async () => {
        await delay(100)
        results.push('async')
      })

      const startTime = Date.now()
      await core.hooks.doAction('test:event')
      const duration = Date.now() - startTime

      // 應該異步執行，立即返回
      expect(duration).toBeLessThan(50)
      // 但事件最終應該被處理
      await delay(200)
      expect(results).toEqual(['async'])
    })

    it('should auto-detect when async listener is present', async () => {
      core.hooks.addAction('test:event', () => 'sync')
      core.hooks.addAction('test:event', async () => 'async')

      // 應該自動切換到異步模式
      const mode = core.hooks.detectMode('test:event')
      expect(mode).toBe('async')
    })
  })

  // 測試 3: 明確異步調用
  describe('Explicit async dispatch', () => {
    it('should work with explicit async option', async () => {
      const results = []

      core.hooks.addAction('test:event', (payload) => {
        results.push(payload)
      })

      await core.hooks.doActionAsync('test:event', { id: 1 }, {
        async: true
      })

      // 等待異步完成
      await delay(100)
      expect(results).toEqual([{ id: 1 }])
    })
  })

  // 測試 4: 順序保證
  describe('Order guarantees', () => {
    it('should maintain order with partition strategy', async () => {
      const events = []

      core.hooks.addAction('order:created', (payload) => {
        events.push(payload.orderId)
      })

      // 發送 10 個相同 orderId 的事件
      for (let i = 0; i < 10; i++) {
        await core.hooks.doActionAsync('order:created', { orderId: 1, seq: i }, {
          ordering: 'partition',
          partitionKey: '1'
        })
      }

      // 等待所有事件處理
      await delay(500)

      // 驗證順序
      expect(events.map((id, idx) => [id, idx])).toEqual(
        Array.from({ length: 10 }, (_, i) => [1, i])
      )
    })
  })

  // 測試 5: Feature Flag 控制
  describe('Feature flag control', () => {
    it('should respect asyncByDefault flag', async () => {
      // 配置異步為默認
      const coreWithAsync = new Core({
        events: { asyncByDefault: true }
      })

      const results = []
      coreWithAsync.hooks.addAction('test:event', () => {
        results.push('called')
      })

      const startTime = Date.now()
      await coreWithAsync.hooks.doAction('test:event')
      const duration = Date.now() - startTime

      // 應該異步執行，立即返回
      expect(duration).toBeLessThan(50)

      // 等待處理完成
      await delay(100)
      expect(results).toEqual(['called'])
    })

    it('should support migration mode', async () => {
      const coreHybrid = new Core({
        events: { migrationMode: 'hybrid' }
      })

      // 應該記錄警告日誌
      const warnSpy = jest.spyOn(logger, 'warn')

      coreHybrid.hooks.addAction('test:event', () => {})
      await coreHybrid.hooks.doAction('test:event')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('同步模式')
      )
    })
  })
})
```

**測試場景涵蓋**：
- ✅ 舊 API 同步執行
- ✅ 新 API 異步執行
- ✅ 混合監聽器自動檢測
- ✅ 順序保證
- ✅ Feature Flag 控制
- ✅ 遷移警告

**驗收標準**：
- [ ] 所有測試通過
- [ ] 覆蓋率 > 85%
- [ ] 無回退情況

**估計工作量**：4-5 小時

---

### ✅ Task 1.1.3.2: 實現自動檢測機制（sync vs async）

**檔案**：`packages/core/src/HookManager.ts`

**目標**：
自動檢測監聽器是否異步，決定派發模式

**詳細需求**：

```typescript
class HookManager {
  /**
   * 檢測監聽器是否異步
   */
  private isAsyncListener(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction' ||
           fn.toString().includes('async')
  }

  /**
   * 自動檢測事件的派發模式
   */
  private detectMode(eventName: string): 'sync' | 'async' {
    const listeners = this.getListeners(eventName)

    // 如果有任何異步監聽器，使用異步模式
    if (listeners.some(l => this.isAsyncListener(l))) {
      return 'async'
    }

    // 配置級別的 asyncByDefault
    if (this.config.events?.asyncByDefault) {
      return 'async'
    }

    return 'sync'
  }

  /**
   * 統一的事件派發 API
   * 內部自動檢測是否使用異步模式
   */
  async doAction(
    name: string,
    payload: any,
    options?: Partial<EventOptions>
  ): Promise<void> {
    const mode = this.detectMode(name)
    const mergedOptions = { ...options, async: mode === 'async' }

    if (mode === 'async') {
      return this.doActionAsync(name, payload, mergedOptions as EventOptions)
    } else {
      return this.doActionSync(name, payload)
    }
  }

  /**
   * 同步派發（向後兼容）
   */
  private doActionSync(name: string, payload: any): void {
    const listeners = this.getListeners(name)
    for (const listener of listeners) {
      listener(payload)
    }
  }

  /**
   * 異步派發（新功能）
   */
  async doActionAsync(
    name: string,
    payload: any,
    options: EventOptions
  ): Promise<void> {
    // 實現邏輯（來自 Phase 1）
  }
}
```

**自動檢測邏輯**：
1. 檢查監聽器是否為 async 函數
2. 檢查配置 `asyncByDefault`
3. 檢查選項參數 `async`
4. 優先級：選項參數 > 配置 > 自動檢測

**驗收標準**：
- [ ] 自動檢測邏輯正確
- [ ] 優先級順序正確
- [ ] 性能開銷 < 1ms

**估計工作量**：2 小時

---

### ✅ Task 1.1.3.3: 添加遷移警告日誌

**檔案**：`packages/core/src/HookManager.ts`

**目標**：
在 Hybrid 模式下，記錄同步派發的警告日誌

**詳細需求**：

```typescript
// 遷移警告系統
class MigrationWarner {
  private suppressedWarnings = new Set<string>()

  warn(eventName: string, message: string): void {
    if (this.suppressedWarnings.has(eventName)) {
      return
    }

    logger.warn(`[Gravito Migration] 事件 "${eventName}" 使用同步模式`)
    logger.warn(`說明：${message}`)
    logger.warn(`參考文檔：https://gravito.dev/docs/events/async-migration`)
    logger.warn(`如要禁止此警告，請設置環境變數：GRAVITO_SUPPRESS_MIGRATION_WARNING=${eventName}`)
  }

  suppress(eventName: string): void {
    this.suppressedWarnings.add(eventName)
  }
}

// 在 doAction 中使用
async doAction(
  name: string,
  payload: any,
  options?: Partial<EventOptions>
): Promise<void> {
  const mode = this.detectMode(name)

  if (this.config.events?.migrationMode === 'hybrid' && mode === 'sync') {
    this.migrationWarner.warn(
      name,
      `建議遷移至異步模式以提升性能`
    )
  }

  // ... rest of the code
}
```

**警告信息**：
```
[Gravito Migration] 事件 "order:created" 使用同步模式
說明：建議遷移至異步模式以提升性能
參考文檔：https://gravito.dev/docs/events/async-migration
如要禁止此警告，請設置環境變數：GRAVITO_SUPPRESS_MIGRATION_WARNING=order:created
```

**環境變數**：
- `GRAVITO_MIGRATION_MODE`：設置遷移模式（sync/hybrid/async）
- `GRAVITO_SUPPRESS_MIGRATION_WARNING=event1,event2`：禁止特定事件的警告

**驗收標準**：
- [ ] 警告日誌正確輸出
- [ ] 環境變數支持
- [ ] 不影響性能

**估計工作量**：1.5 小時

---

### ✅ Task 1.1.3.4: 編寫遷移指南文檔

**檔案**：`docs/MIGRATION_GUIDE_ASYNC_EVENTS.md`

**目標**：
提供完整的遷移指南，幫助開發者遷移至異步模式

**文檔內容**：

```markdown
# Event System 異步化遷移指南

## 概述

本指南幫助你將現有的同步事件系統遷移至新的異步模式。

## 快速開始

### 方式 1: 自動遷移（推薦）

```typescript
// 無需修改代碼，配置即可
const core = new Core({
  events: {
    asyncByDefault: true  // 啟用異步模式
  }
})

// 現有代碼自動使用異步派發
await core.hooks.doAction('order:created', payload)
// ✅ 自動轉換為異步派發
```

### 方式 2: 顯式遷移

```typescript
// 修改代碼使用新 API
await core.hooks.doActionAsync('order:created', payload, {
  priority: 'high',
  timeout: 5000,
  ordering: 'partition',
  partitionKey: payload.orderId
})
```

### 方式 3: 分階段遷移

```typescript
// 使用 Hybrid 模式，同時支持新舊 API
const core = new Core({
  events: {
    migrationMode: 'hybrid'  // 同時支持同步和異步
  }
})

// 逐漸修改監聽器為 async
core.hooks.addAction('order:created', async (payload) => {
  await inventoryService.lock(payload.orderId)
})
```

## 遷移檢查清單

- [ ] 評估所有事件類型（參考 Issue 1.2 的 13 個事件）
- [ ] 確定優先級（High/Normal/Low）
- [ ] 確定順序需求（Strict/Partition/None）
- [ ] 測試異步模式兼容性
- [ ] 更新監聽器為 async 函數
- [ ] 添加錯誤處理
- [ ] 啟用性能監控
- [ ] 驗收測試通過
- [ ] 發佈新版本

## 遷移策略

### Phase 1: 低優先級事件
```typescript
// Analytics、Alert 類事件先遷移
core.hooks.doActionAsync('inventory:released', payload, {
  priority: 'low'
})
```

### Phase 2: 核心流程事件
```typescript
// Order、Payment 類事件需要順序保證
core.hooks.doActionAsync('order:created', payload, {
  priority: 'high',
  ordering: 'partition',
  partitionKey: payload.orderId
})
```

### Phase 3: 失敗事件
```typescript
// DLQ 類事件需要重試支持
core.hooks.doActionAsync('order:lock_permanent_failure', payload, {
  priority: 'high',
  retry: {
    maxRetries: 3,
    dlqAfterMaxRetries: true
  }
})
```

## 常見問題

### Q: 異步模式會影響現有功能嗎？
A: 不會。異步模式是完全向後兼容的。監聽器會異步執行，但會保證可靠性。

### Q: 如何確保事件順序？
A: 使用 `ordering: 'partition'` 和 `partitionKey` 參數。相同分區內的事件會按順序處理。

### Q: 性能提升多少？
A: P99 延遲降低 50%，吞吐提升 3-5 倍。詳見性能基準測試。

## 性能基準

| 指標 | 同步模式 | 異步模式 | 提升 |
|------|---------|---------|------|
| P99 延遲 | 800ms | 400ms | 50% ↓ |
| 吞吐量 | 1000 e/s | 3000-5000 e/s | 3-5x ↑ |
| CPU | 40% | 70% | 30% ↑ |

## 疑難排解

### 問題: 監聽器沒有執行
**原因**: 異步執行，需要等待完成
**解決**: 添加適當的延遲或使用 await

### 問題: 事件順序混亂
**原因**: 未指定 ordering 參數
**解決**: 使用 `ordering: 'partition'` 和 `partitionKey`

### 問題: 性能沒有提升
**原因**: 監聽器本身是同步的
**解決**: 檢查監聽器是否使用 await，確保並行執行

## 支持與反饋

- 文檔：https://gravito.dev/docs/events
- 問題報告：https://github.com/gravito/core/issues
- 討論：https://github.com/gravito/core/discussions
```

**驗收標準**：
- [ ] 文檔清晰完整
- [ ] 代碼示例可運行
- [ ] 包含遷移檢查清單
- [ ] 常見問題涵蓋充分

**估計工作量**：3 小時

---

### ✅ Task 1.1.3.5: 在示例項目中驗證（flash-sale-fullstack）

**檔案**：`examples/flash-sale-fullstack/*`

**目標**：
在實際項目中驗證異步化功能，確保沒有迴歸

**詳細需求**：

```typescript
// 1. 遷移 flash-sale-fullstack 中的事件
// 當前：同步派發
core.hooks.doAction('order:created', { orderId })

// 改為：異步派發
await core.hooks.doActionAsync('order:created', { orderId }, {
  priority: 'high',
  ordering: 'partition',
  partitionKey: orderId
})

// 2. 驗證項目功能
- ✅ 訂單建立流程
- ✅ 庫存鎖定
- ✅ 支付處理
- ✅ 庫存扣減
- ✅ 訂單確認

// 3. 性能測試
npm run benchmark:flash-sale
# 預期：P99 < 400ms，吞吐 > 3000 events/s

// 4. 負載測試
npm run load-test:flash-sale --concurrency=1000
# 預期：無 OOM，無超時
```

**驗證步驟**：
1. **功能驗證**：所有特性正常工作
2. **性能驗證**：性能指標達成
3. **兼容性驗證**：向後相容
4. **應力測試**：高併發穩定

**驗收標準**：
- [ ] 所有功能正常
- [ ] 性能指標達成
- [ ] 無迴退問題
- [ ] 文檔完整

**估計工作量**：4 小時

---

## 📊 工作量統計

| 任務 | 工作量 | 總計 |
|------|--------|------|
| 1.1.3.1 | 4-5 h | 4.5 h |
| 1.1.3.2 | 2 h | 2 h |
| 1.1.3.3 | 1.5 h | 1.5 h |
| 1.1.3.4 | 3 h | 3 h |
| 1.1.3.5 | 4 h | 4 h |
| **總計** | | **15 h** |

---

## ✅ 總體驗收標準

**Compatibility**：
- [ ] 所有測試通過
- [ ] 向後相容無迴退
- [ ] 自動檢測機制正確
- [ ] Feature Flag 功能正常

**Documentation**：
- [ ] 遷移指南清晰完整
- [ ] 代碼示例可運行
- [ ] 常見問題覆蓋充分
- [ ] API 文檔更新

**Verification**：
- [ ] 示例項目驗證通過
- [ ] 性能指標達成
- [ ] 應力測試通過
- [ ] 無已知缺陷

---

## 📝 交付物清單

- `packages/core/tests/HookManager.compatibility.test.ts` - 兼容性測試
- `packages/core/src/HookManager.ts` - 更新自動檢測邏輯
- 遷移警告系統實現
- `docs/MIGRATION_GUIDE_ASYNC_EVENTS.md` - 遷移指南
- 示例項目驗證報告

---

## 🔗 相關文檔

- [Phase 1: 核心異步派發](./Phase1-核心异步派发.md)
- [Phase 2: 可觀測性整合](./Phase2-可观测性整合.md)
- [Issue 1.2: Event System - Reliability](../Issue1.2-事件系统可靠性/README.md)

---

**最後更新**：2026-02-02
