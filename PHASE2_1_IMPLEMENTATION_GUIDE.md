# Phase 2.1 實施指南：解除 core 對 photon 的依賴

**規劃者**: OPUS 4.6 深度分析
**實施者**: Sonnet 4.6
**狀態**: ✅ Phase 2.1 完成 (2026-02-25)
**預估工時**: 1-2 天
**風險等級**: MEDIUM（所有風險已識別並有緩解策略）

---

## 📋 快速概覽

### 目標
解除 `@gravito/core` 對 `@gravito/photon` 的編譯時依賴，使 core 成為零外部框架依賴的微核心。

### 核心決策
- **設計模式**: Factory Registration（已有 `options.adapter` 機制）
- **遷移策略**: Direct Breaking Change（monorepo 內一次性更新）
- **文件移動**: PhotonAdapter 從 core → photon/src/adapter/
- **依賴方向**: photon → core（正確的向心依賴）

### 影響範圍
- **需要修改的檔案**: 17 個（大部分是 import 路徑替換）
- **需要修改的包**: 3 個核心包 + 6 個 examples
- **Satellites 影響**: 零（完全不受影響）

---

## 🎯 實施步驟 (9 Steps)

### ✅ Step 1: 在 photon 中建立 adapter 子模組 [30 分鐘]

**目標**: 創建 `packages/photon/src/adapter/` 並複製代碼

**檔案操作**:
1. 複製 `packages/core/src/adapters/PhotonAdapter.ts` → `packages/photon/src/adapter/PhotonAdapter.ts`
   - 修改 import 路徑：`../http/types` → `@gravito/core`
   - 修改 import：`./types` → `@gravito/core`
   - 修改 import：`../Container/RequestScopeManager` → `@gravito/core`

2. 複製 `packages/core/src/adapters/photon-types.ts` → `packages/photon/src/adapter/photon-types.ts`

3. 創建 `packages/photon/src/adapter/index.ts` (barrel export)
   ```typescript
   export { PhotonAdapter, createPhotonAdapter, GravitoAdapter } from './PhotonAdapter'
   export type { PhotonContextWrapper, PhotonRequestWrapper } from './PhotonAdapter'
   export * from './photon-types'
   ```

4. 修改 `packages/photon/package.json`:
   ```json
   {
     "exports": {
       "./adapter": {
         "types": "./dist/adapter/index.d.ts",
         "default": "./dist/adapter/index.js"
       }
     },
     "dependencies": {
       "@gravito/core": "workspace:*"
     }
   }
   ```

**驗證**:
```bash
cd packages/photon && bun run typecheck
```

**成功標準**: photon 包編譯通過，PhotonAdapter 正確匯出

**回滾**: `rm -rf packages/photon/src/adapter/`

---

### ✅ Step 2: 修改 core 的 PlanetCore [30 分鐘]

**檔案**: `packages/core/src/PlanetCore.ts`

**修改 1 - 移除 import** (L10):
```typescript
// REMOVE: import { PhotonAdapter } from './adapters/PhotonAdapter'
```

**修改 2 - Constructor fallback** (L550):
```typescript
// BEFORE:
} else {
  this._adapter = new PhotonAdapter()
}

// AFTER:
} else {
  throw new Error(
    'No HTTP adapter provided. In non-Bun environments, ' +
    'you must explicitly provide an adapter:\n\n' +
    '  import { PhotonAdapter } from "@gravito/photon/adapter"\n' +
    '  new PlanetCore({ adapter: new PhotonAdapter() })'
  )
}
```

**修改 3 - mountOrbit()** (L765-767):
```typescript
// BEFORE:
} else {
  // It's likely a native app instance (e.g. Hono)
  // Wrap it in PhotonAdapter to conform to HttpAdapter interface.
  subAdapter = new PhotonAdapter({}, orbitApp)
}

// AFTER:
} else {
  throw new Error(
    'mountOrbit() expects a PlanetCore instance or HttpAdapter. ' +
    'To mount a native app (e.g. Hono), wrap it first:\n\n' +
    '  import { PhotonAdapter } from "@gravito/photon/adapter"\n' +
    '  core.mountOrbit("/path", new PhotonAdapter({}, honoApp))'
  )
}
```

**驗證**:
```bash
cd packages/core && bun run typecheck
```

**成功標準**: core 不再 import 任何 photon 符號

---

### ✅ Step 3: 修改 GravitoServer [15 分鐘]

**檔案**: `packages/core/src/GravitoServer.ts`

**修改 1 - 移除 import** (L1):
```typescript
// REMOVE: import { PhotonAdapter } from './adapters/PhotonAdapter'
```

**修改 2 - 構造函式** (約 L39):
```typescript
// BEFORE:
const core = new PlanetCore(
  manifest.config || { adapter: new PhotonAdapter() }
)

// AFTER:
const core = new PlanetCore(manifest.config || {})
```

**驗證**:
```bash
cd packages/core && bun run typecheck
```

---

### ✅ Step 4: 更新 core/src/index.ts [15 分鐘]

**檔案**: `packages/core/src/index.ts`

**移除以下 export** (L25-33):
```typescript
export {
  createGravitoAdapter,
  createPhotonAdapter,
  GravitoAdapter,
  PhotonAdapter,
  PhotonContextWrapper,
  PhotonRequestWrapper,
} from './adapters/PhotonAdapter'
```

**驗證**:
```bash
cd packages/core && bun run typecheck
```

---

### ✅ Step 5: 更新 core/package.json [10 分鐘]

**檔案**: `packages/core/package.json`

**移除 dependency** (L125):
```json
// REMOVE: "@gravito/photon": "workspace:*"
```

**驗證**:
```bash
bun install
cd packages/core && bun run typecheck && bun test
```

**成功標準**: core 的 dependencies 中零 photon

---

### ✅ Step 6: 更新消費者的 import 路徑 [45 分鐘]

**修改 17 個檔案的 import 路徑**:

**Core 測試** (4 個):
1. `packages/core/tests/planet-core-adapter.test.ts`
   - `from '../src/adapters/PhotonAdapter'` → `from '@gravito/photon/adapter'`

2. `packages/core/tests/orbit-middleware-isolation.test.ts`
   - `from '../src/adapters/PhotonAdapter'` → `from '@gravito/photon/adapter'`

3. `packages/core/tests/index.test.ts`
   - `await import('../src/adapters/PhotonAdapter')` → `from '@gravito/photon/adapter'`

4. `packages/core/benchmarks/benchmark-server.ts`
   - `from '../src/adapters/PhotonAdapter'` → `from '@gravito/photon/adapter'`

**GraphQL 測試** (~6 個):
- `packages/graphql/tests/*.test.ts`
- 所有 `import { GravitoAdapter } from '@gravito/core'` → `from '@gravito/photon/adapter'`

**Examples** (6 個):
1. `examples/ecommerce-mvc/src/bootstrap.ts`
2. `examples/banking-cqrs/src/index.ts`
3. `examples/commerce-fullstack/src/bootstrap/launcher.ts`
4. `examples/event-registration-mvc/src/bootstrap.ts`
5. `examples/luminosity-site/src/bootstrap.ts`
6. `examples/official-site/src/bootstrap.ts`

**驗證**:
```bash
bun run typecheck
bun run test
```

---

### ✅ Step 7: 刪除 core 中的舊檔案 [10 分鐘]

**刪除以下檔案**:
1. `packages/core/src/adapters/PhotonAdapter.ts`
2. `packages/core/src/adapters/photon-types.ts`

**驗證**:
```bash
bun run typecheck
bun run test
```

---

### ✅ Step 8: 更新文檔 [20 分鐘]

**修改以下文檔**:
1. `CLAUDE.md` - 更新「core 是零外部框架依賴的微核心」說明
2. `implementation_plan.md` - 標記 2.1 完成
3. `docs/claude/design.md` - 更新架構圖示（core ← photon）
4. README 示例代碼（如有）

---

### ✅ Step 9: 最終驗證 [30 分鐘]

**執行完整驗證**:
```bash
# 清理依賴
rm -rf node_modules
bun install

# 全量型別檢查
bun run typecheck

# 全量測試
bun run test

# 全量構建
bun run build

# 驗證 core 無 photon
ls packages/core/node_modules/@gravito/photon 2>&1
# 應該報告「找不到」
```

**成功標準**:
- ✅ `typecheck`: 0 錯誤
- ✅ `test`: 所有測試通過
- ✅ `build`: ESM/CJS/DTS 全部成功
- ✅ core/node_modules 無 @gravito/photon
- ✅ core/dist 無 photon 相關代碼

---

## 🚨 風險與回滾

### 風險列表

| 風險 | 概率 | 嚴重性 | 回滾方案 |
|------|------|--------|---------|
| import 路徑拼寫錯誤 | LOW | MEDIUM | git diff 檢查 / 逐個修復 |
| PhotonAdapter 在 photon 中 import 失敗 | MEDIUM | HIGH | 檢查相對路徑 / 使用 bun run typecheck 逐步調試 |
| 循環依賴 | LOW | CRITICAL | photon → core 方向正確，無循環 |
| mountOrbit() 行為變更影響用戶 | LOW | MEDIUM | 清晰錯誤訊息引導 / 文檔說明 |

### 回滾策略

**如果任何 Step 失敗**:
1. 停止當前 step
2. 使用 `git checkout -- .` 還原該 step 的修改
3. 回到前一個成功的 step
4. 從頭檢查該 step 的修改邏輯

**完整回滾** (回到 Phase 1 完成狀態):
```bash
git reset --hard HEAD~1
```

---

## 📊 進度追蹤

| Step | 檔案數 | 預估時間 | 狀態 |
|------|--------|---------|------|
| 1. photon adapter | 3 | 30 min | ⏳ |
| 2. PlanetCore | 1 | 30 min | ⏳ |
| 3. GravitoServer | 1 | 15 min | ⏳ |
| 4. core/index.ts | 1 | 15 min | ⏳ |
| 5. core/package.json | 1 | 10 min | ⏳ |
| 6. Import 路徑 | 17 | 45 min | ⏳ |
| 7. 刪除舊檔案 | 2 | 10 min | ⏳ |
| 8. 文檔更新 | 4 | 20 min | ⏳ |
| 9. 最終驗證 | - | 30 min | ⏳ |
| **總計** | **31 個檔案** | **3.5 小時** | |

---

## ✅ 成功指標

Phase 2.1 完成的標記：

- [ ] `packages/photon/src/adapter/` 目錄包含完整的 PhotonAdapter 實作
- [ ] `packages/core/src/adapters/` 不再包含 PhotonAdapter.ts 和 photon-types.ts
- [ ] `packages/core/package.json` 零 photon 依賴
- [ ] `bun run typecheck` 全量通過
- [ ] `bun run test` 全量通過（含 graphql、core、photon）
- [ ] `bun run build` 全量成功
- [ ] 所有 examples 運行正常
- [ ] 文檔已更新，清楚標明新的 import 路徑

---

## 📝 注意事項

1. **RequestScopeManager 是公開 API**：已在 core/src/index.ts 匯出，可安全 import
2. **BunNativeAdapter 保留在 core**：因為它是 core 原生引擎，無需移動
3. **HttpAdapter interface 保留在 core**：core 的核心抽象，photon 依賴它
4. **monorepo 環境**：所有消費者都在 monorepo 內，所以直接 breaking change 是安全的

---

## 🎯 下一步 (Phase 2.2-2.4)

Phase 2.1 完成後：
- **Phase 2.2**: OpenTelemetry 提取（9 peerDeps → @gravito/monitor）
- **Phase 2.3**: 事件系統瘦身（→ @gravito/resilience）
- **Phase 2.4**: HTTP 中介軟體提取（→ photon）

每個 Phase 都會基於 2.1 的架構改進。

---

**準備好？** 交接給 Sonnet 4.6 執行！🚀
