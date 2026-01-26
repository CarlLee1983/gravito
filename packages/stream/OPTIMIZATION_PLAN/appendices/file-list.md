# 新增/修改檔案清單

> **版本**: 1.1.0  
> **更新日期**: 2026-01-17

本文檔記錄優化過程中新增或修改的檔案。

## 新增檔案

### 類型定義檔案 (Phase 1)

- `src/types/driver-configs.ts` - 驅動配置類型定義
- `src/types/redis-client.ts` - Redis 客戶端類型定義（ioredis/node-redis 統一接口）
- `src/types/database.ts` - 數據庫類型定義（查詢結果類型）
- `src/types/config.ts` - 配置類型定義
- `src/types/persistence.ts` - 持久化類型定義

### 優化實現檔案

- `src/workers/ConcurrentWorker.ts` - 並發 Worker 實現 (Phase 6)
- `src/persistence/BufferedPersistence.ts` - 緩衝持久化實現 (Phase 5)
- `src/serializers/CachedSerializer.ts` - 緩存序列化器 (Phase 2, 可選)
- `src/serializers/MessagePackSerializer.ts` - MessagePack 序列化器 (Phase 2, 可選)
- `src/utils/Semaphore.ts` - 信號量實現（用於並發控制）(Phase 6)

### Lua 腳本檔案 (Phase 3, 4)

- `src/drivers/lua/pop-many.lua` - Redis 批量 pop Lua 腳本
- `src/drivers/lua/pop-priority.lua` - Redis 優先級 pop Lua 腳本

### 測試檔案 (Phase 0)

- `tests/benchmark/` - 基準測試套件
- `tests/optimization/` - 優化相關測試

### 文檔檔案

- `OPTIMIZATION_PLAN/` - 優化計劃文檔
- `docs/optimization/` - 優化相關文檔

## 修改檔案

### 核心檔案

| 檔案 | 修改內容 | 涉及 Phase |
|-----|---------|-----------|
| `src/QueueManager.ts` | 類型安全優化、批量操作優化 | 1, 3 |
| `src/Consumer.ts` | BLPOP 整合、批量處理、並發支持 | 6, 8 |
| `src/Worker.ts` | 並發處理支持 | 6 |
| `src/drivers/DatabaseDriver.ts` | 批量操作、連接池優化 | 4 |
| `src/drivers/RedisDriver.ts` | **popMany 重構**、Lua 腳本、BLPOP、Pipeline | 3, 4 |
| `src/drivers/MemoryDriver.ts` | 內存優化（如適用）| 7 |
| `src/persistence/SQLitePersistence.ts` | 批量寫入、類型安全 | 1, 5 |
| `src/persistence/MySQLPersistence.ts` | 批量寫入、類型安全 | 1, 5 |

### 類型檔案

- `src/types.ts` - 類型定義擴展

### 配置檔案

- `package.json` - 新增依賴（如適用）
- `tsconfig.json` - TypeScript 配置優化（strict mode）

## 檔案狀態

| 檔案 | 狀態 | Phase | 備註 |
|-----|------|-------|------|
| `src/types/driver-configs.ts` | 待創建 | 1 | 類型安全 |
| `src/drivers/lua/pop-many.lua` | 🆕 待創建 | 3 | **Redis popMany 重構** |
| `src/drivers/lua/pop-priority.lua` | 🆕 待創建 | 4 | Redis 優先級輪詢優化 |
| `src/workers/ConcurrentWorker.ts` | 待創建 | 6 | 並發處理 ⚠️ |
| `src/persistence/BufferedPersistence.ts` | 待創建 | 5 | 持久化優化 |
| `src/QueueManager.ts` | 待修改 | 1, 3 | 類型安全、批量優化 |
| `src/Consumer.ts` | 待修改 | 6, 8 | **BLPOP 整合**、並發 |
| `src/drivers/DatabaseDriver.ts` | 待修改 | 4 | 驅動優化 |
| `src/drivers/RedisDriver.ts` | 🔴 待修改 | 3, 4 | **popMany 重構優先** |
