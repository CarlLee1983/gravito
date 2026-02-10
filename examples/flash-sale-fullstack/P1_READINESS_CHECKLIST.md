# P1 實施準備清單

**狀態**：等待 PR #292 CI 審查通過
**準備日期**：2026-02-10
**預期開始**：CI 審查通過後立即啟動

---

## ⏳ 在 PR 審查期間可以進行的準備工作

### ✅ 代碼準備（可並行進行）

#### P1.1 - 智能快取預熱

- [ ] **研究 Redis Sorted Set 熱度追蹤**
  - 文件：`src/cache/HotProductTracker.ts`（待創建）
  - 參考：Redis 官方文檔
  - 關鍵概念：ZADD、ZRANGE、ZREM

- [ ] **設計快取預熱接口**
  - 文件：`src/cache/CacheWarmupManager.ts`（待創建）
  - 方法：
    - `warmupOnStartup()` - 啟動時預熱
    - `warmupOnHeatIncrease()` - 熱度增加時預熱
    - `periodicWarmup()` - 定期預熱
    - `preloadRelated()` - 相關商品預熱

- [ ] **Lua 腳本設計**
  - 文件：`src/cache/lua-scripts/`（待創建）
  - 腳本：
    - `atomic_warmup.lua` - 原子性預熱
    - `batch_delete.lua` - 批量刪除
    - `consistency_check.lua` - 一致性檢查

#### P1.2 - 本地二級快取

- [ ] **LRU 快取實現選型**
  - 選項 1：自實現（學習用）
  - 選項 2：使用 `lru-cache` npm 包
  - 決策：評估性能和維護成本

- [ ] **分層快取架構設計**
  - 文件：`src/cache/L1CacheManager.ts`（待創建）
  - 層級：
    - L1：本地記憶體（微秒級）
    - L2：Redis（毫秒級）
    - L3：數據庫（秒級）

- [ ] **一致性協調設計**
  - 同步機制：L1 和 L2 同時失效
  - 版本號方案
  - 衝突解決策略

#### P1.3 - 事件驅動快取更新

- [ ] **事件流分析**
  - 哪些事件影響快取？
  - 快取失效的最小模式集
  - 事件優先級分類

- [ ] **批量處理設計**
  - 文件：`src/cache/CacheInvalidationBatcher.ts`（待創建）
  - 批處理窗口：200ms
  - 去重邏輯
  - DLQ 集成

---

### 📚 文檔準備

#### 設計文檔

- [ ] **P1.1 智能預熱設計文檔**
  - 算法詳解
  - 熱度追蹤機制
  - 預熱策略對比

- [ ] **P1.2 分層快取設計文檔**
  - L1/L2/L3 對比分析
  - 記憶體管理策略
  - 一致性保證機制

- [ ] **P1.3 事件優化設計文檔**
  - 事件模式分析
  - 批量處理收益
  - DLQ 故障恢復

#### API 設計文檔

- [ ] **快取 API 定義**
  ```typescript
  interface CacheAPI {
    // P1.1
    warmup(strategy: 'startup' | 'periodic' | 'heat'): Promise<void>
    getHeatInfo(): HeatMetrics

    // P1.2
    getL1(key: string): any | null
    getL2(key: string): Promise<any | null>
    getWithFallback(key: string): Promise<any>

    // P1.3
    invalidatePattern(pattern: string): Promise<void>
    invalidateBatch(patterns: string[]): Promise<void>
  }
  ```

---

### 🧪 測試準備

#### 單元測試框架

- [ ] **P1.1 測試套件**
  - HotProductTracker 測試
  - CacheWarmupManager 測試
  - Lua 腳本測試

- [ ] **P1.2 測試套件**
  - L1CacheManager 測試
  - 分層回源邏輯測試
  - 一致性測試

- [ ] **P1.3 測試套件**
  - 批量失效測試
  - 去重邏輯測試
  - DLQ 重試測試

#### 集成測試場景

- [ ] **高熱度商品預熱場景**
- [ ] **快取分層訪問場景**
- [ ] **同時修改多個商品場景**
- [ ] **失效衝突恢復場景**

---

### 📊 性能基準準備

#### 基準測試計劃

- [ ] **快取命中率測試**
  - 預期命中率：> 95%
  - 測試方法：k6 負載測試

- [ ] **延遲測試**
  - L1 命中延遲：< 0.1ms
  - L2 命中延遲：< 1ms
  - P99 延遲目標：< 5ms

- [ ] **記憶體使用測試**
  - L1 峰值記憶體：< 100MB
  - 記憶體穩定性：24 小時無洩漏

---

## 📅 分階段實施計劃

### Phase 1：代碼實施（CI 審查通過後立即開始）

**Week 1 (Day 1-3)**
- [ ] P1.1 智能預熱實施完成
- [ ] P1.2 本地二級快取基礎完成
- [ ] 單元測試編寫

**Week 1 (Day 4-5)**
- [ ] P1.3 事件優化實施
- [ ] 集成測試編寫
- [ ] 性能測試準備

### Phase 2：測試驗證（Week 2）

**Monday-Wednesday**
- [ ] 功能驗證
- [ ] 性能基準測試
- [ ] 記憶體洩漏檢測

**Thursday-Friday**
- [ ] 整合測試
- [ ] 文檔完成
- [ ] PR 準備

---

## 🚀 立即開始指南

### 當 PR #292 CI 審查通過時執行以下步驟：

```bash
# 1. 更新 main 分支
git checkout main
git pull origin main

# 2. 建立 P1 功能分支
git checkout -b feature/flash-sale-p1-implementation

# 3. 建立基本文件結構
mkdir -p src/cache/lua-scripts
mkdir -p src/cache/tests
mkdir -p tests/cache-integration

# 4. 初始化 P1 實施
# - 複製 P1 規劃到分支
# - 建立 src/cache/*.ts 文件
# - 建立 package.json 依賴更新

# 5. 開始實施 P1.1
bun run dev  # 啟動開發環境
```

### 依賴檢查

**需要安裝的包：**
- [ ] `lru-cache` - L1 快取實現
- [ ] `redis` (已有) - L2 快取
- [ ] `@lua-script/redis` - Lua 腳本支持（可選）

**檢查命令：**
```bash
bun add lru-cache --save
bun run typecheck  # 確保類型正確
bun run check      # 確保格式規範
```

---

## ✅ 前置條件檢查

在開始 P1 之前，確認以下條件：

- [ ] PR #292 已合併到 main
- [ ] `release/p0-complete` 已驗證並部署
- [ ] P0 系統運行穩定（99.9% 可用性）
- [ ] 監控告警系統正常
- [ ] DynamicPoolManager 正常工作
- [ ] 團隊已熟悉 P0 代碼

---

## 📞 P1 啟動檢查表

當 CI 審查通過後，運行以下檢查：

```bash
# ✅ 1. 檢查 main 分支最新
git checkout main
git log -1 --oneline

# ✅ 2. 確認 P0 代碼存在
ls examples/flash-sale-fullstack/src/database/DynamicPoolManager.ts

# ✅ 3. 檢查 P0 文檔完整
ls examples/flash-sale-fullstack/{TRACING,ALERTING,POOL_OPTIMIZATION}_SETUP.md

# ✅ 4. 驗證應用啟動
cd examples/flash-sale-fullstack
bun run src/app.ts  # 應該在 3000 運行

# ✅ 5. 驗證 Docker 服務
docker-compose ps  # 所有服務應該是 running

# ✅ 6. 類型檢查
bun run typecheck  # 應該全部通過

# ✅ 7. Lint 檢查
bun run check      # 應該沒有錯誤
```

---

## 🎯 P1 成功標準

P1 完成時應達到：

- ✅ 快取命中率 > 95%
- ✅ P99 延遲 < 5ms（相比 P0 的 12.4ms）
- ✅ L1 熱點訪問 < 0.1ms（70 倍提升）
- ✅ 零快取一致性問題
- ✅ 零失效衝突
- ✅ 記憶體使用穩定
- ✅ 完整文檔和測試

---

## 📝 進度追蹤

**等待中... CI 審查進度：**

```
PR #292: P0 完成 - Flash Sale 系統可觀測性、監控和容量優化
├─ CodeQL: ✅ 通過
├─ Lint & Build: ⏳ 進行中...
└─ Workers Builds: ❌ (與例子無關)

當所有檢查通過 → P1 可立即開始
```

---

**準備完成！等待 CI 審查通過後，P1 將立即啟動。** 🚀
