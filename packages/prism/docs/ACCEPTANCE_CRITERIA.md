# 驗收標準 (Acceptance Criteria)

> **版本**: 3.1.0
> **用途**: 每個 Phase 完成後的驗收清單,確保品質與相容性

---

## 🎯 總體驗收標準

所有 Phase 完成後,必須通過以下總體驗收:

### 功能驗收 ✅

- [ ] **所有計劃功能實作完成**
  - [ ] Phase 1: 模板快取、正則優化、組件 tokenizer
  - [ ] Phase 2: AVIF/WebP/Picture、LQIP、CDN loader
  - [ ] Phase 3: LSP 警告修復、類型安全、測試覆蓋
  - [ ] Phase 4: 增量 SSG、動態路由
  - [ ] Phase 5: 架構重構、目錄重組

- [ ] **所有公開 API 正常運作**
  - [ ] `TemplateEngine` 渲染正確
  - [ ] `ImageService` 圖片優化正確
  - [ ] `StaticSiteGenerator` 建置正確
  - [ ] React/Vue 組件正常

### 測試驗收 🧪

- [ ] **所有測試通過**
  - [ ] 現有測試: 33+ 個測試全部通過
  - [ ] 新增測試: 每個 Phase 新增的測試通過
  - [ ] 整合測試: 跨 Phase 整合測試通過
  - [ ] 效能測試: 基準測試達標

- [ ] **測試覆蓋率達標**
  - [ ] 總覆蓋率 >85%
  - [ ] 核心模組 (`TemplateEngine`, `ImageService`, `SSG`) >90%
  - [ ] 新增模組 (`TemplateCache`, `IncrementalBuilder`) >85%
  - [ ] 執行 `bun test --coverage` 驗證

### LSP 驗收 🔍

- [ ] **無類型錯誤**
  - [ ] `bun run typecheck` 無錯誤
  - [ ] 所有檔案類型完整
  - [ ] 無 `any` 類型濫用

- [ ] **無 Lint 警告**
  - [ ] 修復所有 4 個原有警告
  - [ ] 無新增警告
  - [ ] Biome 規則通過

### 相容性驗收 🔗

- [ ] **向下相容性保證**
  - [ ] 所有現有 API 行為不變
  - [ ] 導入路徑不變
  - [ ] 預設設定不變
  - [ ] 13 個依賴專案無需修改

- [ ] **依賴專案測試**
  - [ ] 在至少 3 個依賴專案測試
  - [ ] 所有依賴專案測試通過
  - [ ] 無破壞性變更

### 效能驗收 ⚡

- [ ] **效能指標達標**
  - [ ] 重複渲染效能提升 >30%
  - [ ] Cache hit rate >90%
  - [ ] 增量建置時間 <10% 全量時間
  - [ ] 內存使用穩定

### 文檔驗收 📚

- [ ] **文檔完整性**
  - [ ] README 更新
  - [ ] CHANGELOG 完整
  - [ ] API 文檔齊全
  - [ ] 遷移指南清晰

---

## Phase 1: 效能優化 - 驗收清單

### 功能驗收

- [ ] **TemplateCache 實作完成**
  - [ ] LRU 快取機制正常
  - [ ] Hash 驗證正確偵測變更
  - [ ] Source cache 和 Compiled cache 分離
  - [ ] 統計資料 (hits/misses/hit rate) 正確
  - [ ] `clear()` 方法正常
  - [ ] 可配置 `maxSize`、`enabled`、`development`

- [ ] **TemplateEngine 整合 Cache**
  - [ ] `readTemplate()` 使用 source cache
  - [ ] `compile()` 使用 compiled cache (if implemented)
  - [ ] 新增 `cacheOptions` 參數到構造函數
  - [ ] 預設行為向下相容

- [ ] **Regex 優化完成**
  - [ ] 所有 `while + exec` 改為 `matchAll`
  - [ ] `extractSections()` 使用 `matchAll`
  - [ ] `extractStacks()` 使用 `matchAll`
  - [ ] `parseHelperArgs()` 使用 `matchAll`

- [ ] **組件 Tokenizer 優化**
  - [ ] 一次掃描 tokenize (O(n) 複雜度)
  - [ ] Stack-based 匹配取代字串搜尋
  - [ ] 深度嵌套 (<10 層) 正常運作
  - [ ] Self-closing tags 正確處理

### 測試驗收

- [ ] **現有測試通過**
  - [ ] 所有 33+ 個現有測試通過
  - [ ] 無測試行為變更

- [ ] **新增測試通過**
  - [ ] Cache 測試 (至少 7 個)
    - [ ] `should cache and retrieve compiled templates`
    - [ ] `should invalidate cache when hash changes`
    - [ ] `should evict least recently used items`
    - [ ] `should track cache statistics`
    - [ ] `should disable caching when enabled=false`
    - [ ] `should respect maxSize limit`
    - [ ] `should provide hit rate calculation`
  - [ ] 效能測試 (至少 4 個)
    - [ ] `should render simple template 10000 times`
    - [ ] `should cache compiled templates`
    - [ ] `should handle deeply nested components efficiently`
    - [ ] `should measure cache hit rate`

### LSP 驗收

- [ ] **警告修復**
  - [ ] `noAssignInExpressions` 3 個警告全部修復
  - [ ] 無新警告產生

- [ ] **類型檢查**
  - [ ] `bun run typecheck` 通過
  - [ ] `CacheOptions` 類型正確導出
  - [ ] `CacheStats` 類型正確導出

### 效能驗收

- [ ] **效能基準達標**
  - [ ] 簡單模板 10000 次渲染 <5000ms
  - [ ] 深度嵌套組件渲染 <100ms
  - [ ] Cache hit rate 計算正確
  - [ ] 重複渲染效能提升 >30%

### 相容性驗收

- [ ] **API 相容性**
  - [ ] `new TemplateEngine(viewsDir)` 預設行為不變
  - [ ] `new TemplateEngine(viewsDir, cacheOptions)` 正常運作
  - [ ] `new OrbitPrism()` 預設行為不變
  - [ ] `new OrbitPrism({ cache })` 正常運作

---

## Phase 2: 圖片功能增強 - 驗收清單

### 功能驗收

- [ ] **ImageService 擴展功能**
  - [ ] `ImageOptions` 新增 `format`、`formats`、`lqip`、`cdn`
  - [ ] `generatePictureElement()` 方法實作
  - [ ] `generateSrcset()` 支援 AVIF/WebP
  - [ ] LQIP 資料 URI 生成正確
  - [ ] 保持預設行為不變

- [ ] **CDN Loader 實作**
  - [ ] `ImageCDNLoader` 抽象類別完成
  - [ ] Cloudinary loader 實作
  - [ ] imgix loader 實作
  - [ ] Vercel Image loader 實作
  - [ ] 可配置 CDN 選項

- [ ] **LQIP 工具實作**
  - [ ] `ImagePlaceholder.generateDataURI()` 實作
  - [ ] 支援 BlurHash / ThumbHash
  - [ ] 尺寸 <1KB (0.05 BPP)
  - [ ] Base64 編碼正確

- [ ] **React/Vue 組件更新**
  - [ ] React `<Image>` 支援新 props
  - [ ] Vue `<Image>` 支援新 props
  - [ ] `lqip` prop 正確渲染
  - [ ] `cdn` prop 正確運作

### 測試驗收

- [ ] **新增測試通過**
  - [ ] Picture 元素生成測試 (3 個)
  - [ ] CDN loader 測試 (9 個,每個 loader 3 個)
  - [ ] LQIP 生成測試 (4 個)
  - [ ] React/Vue 組件測試 (6 個)

### LSP 驗收

- [ ] **類型完整性**
  - [ ] `ImageOptions` 擴展正確
  - [ ] `CDNLoaderOptions` 類型正確
  - [ ] `PlaceholderOptions` 類型正確
  - [ ] `bun run typecheck` 通過

### 效能驗收

- [ ] **圖片優化效果**
  - [ ] AVIF 格式尺寸 <WebP <30%
  - [ ] LQIP 尺寸 <1KB
  - [ ] `<picture>` 元素正確設定 `type` 屬性

### 相容性驗收

- [ ] **預設行為不變**
  - [ ] `{{image src="/test.jpg"}}` 輸出不變
  - [ ] 未指定 `formats` 時使用預設 srcset
  - [ ] React/Vue 組件預設 props 不變

---

## Phase 3: 程式碼品質 - 驗收清單

### 功能驗收

- [ ] **LSP 警告修復**
  - [ ] `noAssignInExpressions` 3 個修復
  - [ ] `noNonNullAssertion` 1 個修復
  - [ ] 無新警告產生

- [ ] **類型安全改善**
  - [ ] `SSG.ts` 類型完整
  - [ ] Router 類型 guards 新增
  - [ ] 無 `any` 濫用

- [ ] **JSDoc 文檔**
  - [ ] 所有公開 API 有 JSDoc
  - [ ] 所有公開類型有註解
  - [ ] 範例程式碼清晰

### 測試驗收

- [ ] **測試覆蓋率達標**
  - [ ] 總覆蓋率 >85%
  - [ ] `TemplateEngine.ts` >90%
  - [ ] `ImageService.ts` >90%
  - [ ] `SSG.ts` >85%

- [ ] **新增測試**
  - [ ] SSG 類型安全測試 (3 個)
  - [ ] Edge case 測試 (5 個)
  - [ ] 錯誤處理測試 (4 個)

### LSP 驗收

- [ ] **完全無警告**
  - [ ] `bun run typecheck` 無錯誤、無警告
  - [ ] Biome 規則通過
  - [ ] 所有類型正確導出

### 文檔驗收

- [ ] **JSDoc 完整性**
  - [ ] `TemplateEngine` 所有方法有 JSDoc
  - [ ] `ImageService` 所有方法有 JSDoc
  - [ ] `StaticSiteGenerator` 所有方法有 JSDoc
  - [ ] API 參考文檔生成正確

---

## Phase 4: SSG 增強 - 驗收清單

### 功能驗收

- [ ] **IncrementalBuilder 實作**
  - [ ] Manifest 正確追蹤變更
  - [ ] Hash 驗證偵測變更
  - [ ] 未變更頁面正確跳過
  - [ ] `force: true` 強制全量建置
  - [ ] 統計資料正確

- [ ] **DynamicRouteResolver 實作**
  - [ ] `[slug]` 單段參數解析
  - [ ] `[...path]` 多段參數解析
  - [ ] 缺少參數時拋出錯誤
  - [ ] `getData` 正確傳遞參數

- [ ] **StaticSiteGenerator 擴展**
  - [ ] `exportDynamic()` 方法實作
  - [ ] `exportIncremental()` 方法實作
  - [ ] `ExportOptions` 完整
  - [ ] 現有 `export()` 不變

### 測試驗收

- [ ] **新增測試通過**
  - [ ] 增量建置測試 (7 個)
    - [ ] `should create manifest on first build`
    - [ ] `should skip unchanged pages on second build`
    - [ ] `should rebuild when source data changes`
    - [ ] `should rebuild when template changes`
    - [ ] `should force rebuild with force=true`
    - [ ] `should track build statistics`
    - [ ] `should handle concurrent builds safely`
  - [ ] 動態路由測試 (4 個)
    - [ ] `should resolve [slug] patterns`
    - [ ] `should resolve [...path] patterns`
    - [ ] `should throw on missing params`
    - [ ] `should pass getData params correctly`

### 效能驗收

- [ ] **增量建置效能**
  - [ ] 增量建置時間 <10% 全量時間
  - [ ] 跳過率 >80% (無變更時)
  - [ ] Manifest 大小 <1MB (1000 頁面)

### 相容性驗收

- [ ] **預設行為不變**
  - [ ] `ssg.export()` 完全不變
  - [ ] 新方法為 opt-in
  - [ ] 現有建置流程不受影響

---

## Phase 5: 架構重構 - 驗收清單

### 功能驗收

- [ ] **目錄重組完成**
  - [ ] `src/core/` 目錄建立
  - [ ] `src/engine/` 目錄建立
  - [ ] `src/image/` 目錄建立
  - [ ] `src/ssg/` 目錄建立
  - [ ] `src/types/` 目錄建立

- [ ] **TemplateCompiler 提取**
  - [ ] `TemplateCompiler` 類別實作
  - [ ] 指令處理邏輯遷移
  - [ ] `TemplateEngine` 重構使用
  - [ ] 職責清晰分離

- [ ] **Barrel Exports 更新**
  - [ ] `index.ts` 正確導出所有 API
  - [ ] 向下相容性保證
  - [ ] 類型提示正常

### 測試驗收

- [ ] **所有測試通過**
  - [ ] 現有測試全部通過
  - [ ] 重構後無行為變更
  - [ ] 新增架構測試通過

### LSP 驗收

- [ ] **無循環依賴**
  - [ ] `madge --circular src` 無循環
  - [ ] 模組耦合度低

- [ ] **類型完整**
  - [ ] 所有公開 API 類型完整
  - [ ] 所有內部類型正確
  - [ ] `bun run typecheck` 通過

### 文檔驗收

- [ ] **文檔完整**
  - [ ] README 更新
  - [ ] CHANGELOG 完整
  - [ ] API 文檔完整
  - [ ] ARCHITECTURE.md 建立

---

## 🚀 最終發布驗收

完成所有 Phase 後,發布 v3.1.0 前的最終檢查:

### 建置驗收

- [ ] **建置成功**
  - [ ] `bun run build` 成功 (if applicable)
  - [ ] 產物正確
  - [ ] 無建置警告

### 版本驗收

- [ ] **版本號正確**
  - [ ] `package.json` 版本為 `3.1.0`
  - [ ] Git tag `v3.1.0` 建立
  - [ ] CHANGELOG 版本正確

### 依賴驗收

- [ ] **依賴專案測試**
  - [ ] 在至少 3 個依賴專案測試
  - [ ] 所有依賴專案測試通過
  - [ ] 無破壞性變更回報

### 文檔驗收

- [ ] **發布文檔齊全**
  - [ ] README 反映 v3.1.0 功能
  - [ ] CHANGELOG 完整
  - [ ] MIGRATION.md 清晰
  - [ ] API 文檔更新

### 效能驗收

- [ ] **效能指標驗證**
  - [ ] 重複渲染 +30% ✅
  - [ ] Cache hit rate >90% ✅
  - [ ] 增量建置 <10% 全量時間 ✅
  - [ ] 內存使用穩定 ✅

---

## 📋 驗收流程

### 每個 Phase 完成時

1. **自我檢查**: 完成該 Phase 的驗收清單
2. **執行測試**: `bun test && bun run typecheck`
3. **效能測試**: 執行效能基準測試
4. **文檔更新**: 更新相關文檔
5. **Commit**: 提交程式碼與文檔

### 所有 Phase 完成時

1. **總體驗收**: 檢查總體驗收標準
2. **整合測試**: 在依賴專案測試
3. **效能驗證**: 驗證所有效能指標
4. **文檔審查**: 審查所有文檔
5. **發布準備**: 更新版本號、CHANGELOG、Git tag

### 發布後

1. **監控**: 監控依賴專案使用情況
2. **Issue 追蹤**: 追蹤回報的問題
3. **效能監控**: 監控生產環境效能
4. **文檔補充**: 根據反饋補充文檔

---

## ⚠️ 驗收失敗處理

### 測試失敗

**行動**:
1. 停止進入下一階段
2. 分析失敗原因
3. 修復問題
4. 重新執行驗收

### 效能未達標

**行動**:
1. 分析效能瓶頸
2. 優化實作
3. 重新測試
4. 若無法達標,調整目標或實作方案

### 相容性破壞

**行動**:
1. **立即回滾** 破壞性變更
2. 重新設計實作方案
3. 確保向下相容
4. 重新驗收

### LSP 警告無法修復

**行動**:
1. 評估警告嚴重性
2. 若為誤報,新增 suppress 註解
3. 若為真實問題,重構程式碼
4. 記錄決策原因

---

## 📊 驗收報告範本

完成驗收後,填寫以下報告:

```markdown
# @gravito/prism v3.1.0 驗收報告

## Phase 1: 效能優化
- 狀態: ✅ 通過 / ⚠️ 部分通過 / ❌ 未通過
- 測試通過率: XX/XX (XX%)
- 效能提升: +XX%
- 問題: (若有)

## Phase 2: 圖片功能增強
- 狀態: ✅ 通過
- ...

## Phase 3: 程式碼品質
- 狀態: ✅ 通過
- ...

## Phase 4: SSG 增強
- 狀態: ✅ 通過
- ...

## Phase 5: 架構重構
- 狀態: ✅ 通過
- ...

## 總體驗收
- 功能驗收: ✅ 通過
- 測試驗收: ✅ 通過 (覆蓋率 XX%)
- LSP 驗收: ✅ 通過 (0 警告)
- 相容性驗收: ✅ 通過 (13/13 專案)
- 效能驗收: ✅ 通過 (+XX% 效能)

## 發布建議
✅ 建議發布 v3.1.0
⚠️ 建議修復 XX 問題後發布
❌ 不建議發布,需重大修復

## 備註
(其他說明)
```

---

**上一文檔**: [← Phase 5: 架構重構](./PHASE5_ARCHITECTURE_REFACTOR.md)
**下一文檔**: [向下相容性指南](./BACKWARD_COMPATIBILITY.md) →
