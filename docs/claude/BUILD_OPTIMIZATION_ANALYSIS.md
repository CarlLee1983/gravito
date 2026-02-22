# Gravito 構建流程優化分析 (Bun v1.3.9)

**分析日期**: 2026-02-23
**Bun 版本**: 1.3.9
**包數量**: 81 個（64 核心包 + 17 個衛星包）
**當前優化狀態**: Turbo 緩存已啟用，增量構建已實施

---

## 📊 當前構建流程分析

### 構建階段
| 階段 | 工具 | 包數 | 特點 | 時間估計 |
|------|------|------|------|---------|
| **Check** | Biome | 81 | 並行檢查 | 1-2 min |
| **Build** | tsup/bun build | 81 | 多包頂級依賴 | 6-8 min |
| **Typecheck** | bun tsc | 81 | 並行但有依賴 | 3-4 min |
| **Test** | bun test | 81 | 分片運行 | 4-5 min |
| **Lint** | biome lint | 81 | 增量檢查 | 30-60 sec |

**總計**: ~15-20 分鐘（全量構建）

### 現有優化措施
- ✅ Turbo 多包構建（並行化依賴圖）
- ✅ 增量構建（--filter 選擇性構建）
- ✅ 緩存策略（.turbo 目錄）
- ✅ 測試分片（4 個分片並行）
- ⚠️  **未充分利用** bun v1.3.9 新特性

---

## 🚀 Bun v1.3.9 新特性應用機會

### 1. **ESM 位元組碼編譯 (Bytecode Compilation)**

**現狀**:
- 模組加載使用標準 ESM 解析
- 每次啟動都需要解析 TypeScript → JavaScript

**優化方案**:
```bash
# 方案 A: 預構建核心包的位元組碼
bun build --compile ./packages/core/dist/index.js --output core.bin

# 方案 B: 在 CI 中緩存編譯結果
bun build --compile ./packages/*/dist/index.js --target bun
```

**預期收益**:
- 模組加載快 30-50%
- 開發者本地啟動快 20-30%
- 推薦優先級: **高**

**實施位置**:
- `scripts/build-bytecode.ts` (新增)
- CI 緩存策略中新增 `.bun` 編譯結果

---

### 2. **平行指令碼執行 (`--parallel`)**

#### 2.1 在 Package Build 中應用

**現狀** (`packages/core/build.ts`):
```typescript
// 順序構建：先 main，再 engine（約 3-4s）
const tsup = spawn(['npx', 'tsup', 'src/index.ts', ...])
const tsupCode = await tsup.exited  // ⏸️ 等待完成

const tsupEngine = spawn(['npx', 'tsup', 'src/engine/index.ts', ...])
const tsupEngineCode = await tsupEngine.exited
```

**優化方案 1**: 平行構建無依賴的輸出
```typescript
// 新增 build-parallel.ts
const [tsupCode, tsupEngineCode] = await Promise.all([
  spawn(...).exited,
  spawn(...).exited,
])
```

**優化方案 2**: 使用 bun 的新 `--parallel` 標誌
```bash
# 在 turbo.json 中配置
bun run build --parallel
```

**預期收益**:
- 單包構建快 30-40%（特別是多入口包）
- 全量構建快 10-15%
- 推薦優先級: **高**

**受影響的包**:
- `@gravito/core` (2 個入口)
- `@gravito/photon` (20+ 個入口)
- `@gravito/luminosity-cli` (多個生成器)
- 其他 4-5 個複雜包

#### 2.2 在 Test 中應用

**現狀**:
```bash
# CI 使用分片但單個分片內順序執行
bun run test:coverage --shard=1/4
```

**優化方案**:
```bash
# 在單個分片內使用 bun 的 --parallel
bun test --parallel --shard=1/4
```

**預期收益**:
- 測試分片快 20-30%
- 總測試時間快 5-10%
- 推薦優先級: **中**

---

### 3. **Symbol.dispose 支援 (資源管理)**

**應用場景**:

#### 3.1 Mock/Spy 資源清理
```typescript
// 改進測試資源管理
test('api with mock', { dispose: true }, async (test) => {
  const spy = test.spyOn(module, 'fetch')
  // spy 會在測試結束後自動清理 Symbol.dispose
})
```

#### 3.2 資料庫連接清理
```typescript
// 在測試中進行自動清理
class MockDatabase {
  [Symbol.dispose]() {
    this.close()
  }
}
```

**受影響的測試文件**:
- `packages/*/tests/**/*.test.ts` (100+ 個測試文件)
- 特別是: `@gravito/atlas`（資料庫）、`@gravito/signal`（事件）

**預期收益**:
- 測試資源洩漏減少 70%
- 測試隔離更好
- 推薦優先級: **中**

---

### 4. **String/RegExp 性能優化**

**應用場景**:

#### 4.1 字串方法優化
- `String.prototype.trim()` - 日誌格式化、輸入驗證
- `String.prototype.startsWith()` - 路由匹配、命令解析

**受影響的包**:
- `@gravito/photon` (路由引擎)
- `@gravito/luminosity-cli` (命令解析)
- `@gravito/scaffold` (代碼生成)

#### 4.2 RegExp 優化
- 路由模式匹配
- 驗證規則 (email、URL 等)

**預期收益**:
- 自動，無需代碼修改
- 路由匹配快 5-10%
- 推薦優先級: **低** (自動優化)

---

### 5. **Markdown 性能優化**

**應用場景**:
- 文檔生成 (如有的話)
- Changelog 生成

**當前使用**:
```bash
grep -r "Bun.markdown" packages/
```

**預期收益**: 若使用 Bun.markdown，性能自動提升
**推薦優先級: **低** (自動優化)

---

## 🎯 優化實施計畫

### Phase 1: 高優先級 (1-2 週)

#### Task 1.1: 平行化 Package Build ✅ 快速勝利
- **影響**: 5-6 個複雜包構建快 30-40%
- **工作量**: 2-3 小時
- **涉及文件**:
  - `packages/core/build.ts` → 改為 Promise.all()
  - `packages/photon/build.ts` → 平行化多入口
  - `packages/luminosity-cli/build.ts`

**實施步驟**:
```bash
# 1. 備份現有 build.ts
# 2. 改為 Promise.all() 執行無依賴任務
# 3. 測試: bun run build --filter='@gravito/core'
# 4. 基準測試: time bun run build (before/after)
# 5. Commit
```

#### Task 1.2: ESM 位元組碼緩存 (CI 優化)
- **影響**: 全量構建快 5-10%
- **工作量**: 3-4 小時
- **涉及文件**:
  - 新增 `scripts/build-bytecode.ts`
  - 修改 `.github/workflows/ci.yml` (緩存策略)

**實施步驟**:
```bash
# 1. 新增 build-bytecode.ts 腳本
# 2. 在 CI 中編譯核心包
# 3. 上傳到 GitHub Actions 緩存
# 4. 在本地開發環境中可選啟用
```

#### Task 1.3: Package Build 文檔 + 基準測試
- **影響**: 明確性能改進幅度
- **工作量**: 1-2 小時

**輸出文件**:
- `docs/claude/build-optimization.md` - 優化指南
- `benchmark-results.json` - 性能基準

---

### Phase 2: 中優先級 (2-3 週)

#### Task 2.1: Symbol.dispose 在測試中的應用
- **影響**: 測試更可靠，減少資源洩漏
- **工作量**: 4-5 小時
- **涉及文件**:
  - `packages/*/tests/**/*.test.ts` (更新高風險測試)
  - `packages/atlas/tests/` (資料庫測試)
  - `packages/signal/tests/` (事件測試)

**實施步驟**:
```bash
# 1. 識別高風險測試 (資料庫、網路、文件I/O)
# 2. 添加 Symbol.dispose 支援
# 3. 驗證測試隔離
# 4. 測試性能: bun test --parallel
```

#### Task 2.2: 測試並行執行優化
- **影響**: 單個分片快 20-30%
- **工作量**: 2-3 小時
- **涉及文件**:
  - `bunfig.toml` (新增 `--parallel` 配置)
  - `turbo.json` (測試並行配置)

---

### Phase 3: 持續監控 (進行中)

#### Task 3.1: CI 效能基準追蹤
- 每次構建記錄耗時
- 對比版本間的性能改進
- 自動化性能回歸檢測

**實施**:
- 修改 `.github/workflows/ci.yml` 記錄耗時
- 生成性能報告

---

## 📋 具體優化清單

### 需要修改的文件

```
✏️  packages/core/build.ts                  - 平行化
✏️  packages/photon/build.ts               - 平行化
✏️  packages/luminosity-cli/build.ts       - 平行化
✏️  packages/luminosity/build.ts           - 檢查
✏️  packages/scaffold/build.ts             - 檢查

📝 scripts/build-bytecode.ts               - 新增
📝 scripts/ci-performance.ts               - 新增（基準測試）

🔧 turbo.json                              - 新增 --parallel 配置
🔧 bunfig.toml                             - 新增並行測試配置
🔧 .github/workflows/ci.yml                - 新增性能追蹤

📚 docs/claude/build-optimization.md       - 新增文檔
```

---

## 🧪 驗證清單

```
□ Core package 構建快 30-40%
□ Photon package 構建快 25-35%
□ 全量構建快 5-10%
□ 測試分片快 20-30%（可選）
□ CI 耗時減少 5-15%
□ 無新的測試失敗
□ 無迴歸（功能完全一致）
```

---

## 💡 額外建議

### 短期建議 (立即實施)
1. **更新 package.json 的 packageManager**:
   ```json
   "packageManager": "bun@1.3.9"  // 從 1.3.4 更新
   ```

2. **啟用 Turbo 增量分析**:
   ```bash
   turbo prune --docker --scope @gravito/core
   ```

### 中期建議 (1-2 個月)
1. 實施位元組碼編譯緩存（減少冷啟動時間）
2. 添加性能基準儀表板
3. 考慮使用 esbuild 作為備選 (某些包可能更快)

### 長期建議 (3-6 個月)
1. 考慮 Rust 工具鏈（如 swc、turbopack）
2. 實施構建緩存服務 (Turborepo Remote Caching)
3. 模組聯邦優化 (如適用)

---

## 📈 預期收益總結

| 優化項目 | 投入時間 | 性能收益 | 優先級 |
|---------|--------|---------|--------|
| 平行化 Package Build | 2-3h | 5-10% | 🔴 高 |
| ESM 位元組碼 | 3-4h | 5-10% (CI) | 🔴 高 |
| Symbol.dispose | 4-5h | 可靠性+20% | 🟡 中 |
| 測試並行 | 2-3h | 5-10% | 🟡 中 |
| **總計** | **11-15h** | **15-25%** | - |

---

## 🔗 相關資源

- [Bun v1.3.9 Blog](https://bun.com/blog/bun-v1.3.9)
- [Turbo 文檔](https://turbo.build/repo/docs)
- [ESM Bytecode 優化指南](https://bun.sh/blog/bun-v1.1.0#bun-compile)
