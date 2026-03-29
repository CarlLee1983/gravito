# Requirements: Gravito-Core v2.1.0 Core DX 改進

**Defined:** 2026-03-29
**Core Value:** 穩定可靠的核心基礎設施 — 提升 @gravito/core 開發者體驗

## v2.1.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### API Footgun 修正

- [ ] **FIX-01**: Router 路由註冊不在 stdout 輸出 console.log（Router.ts:610）
- [ ] **FIX-02**: Router model() 使用自訂 ModelNotFoundException 取代 string sentinel 比對（Router.ts:436,475）
- [ ] **FIX-03**: PlanetCore.boot() 正確傳遞 observabilityProvider 到 constructor（PlanetCore.ts:788-811）
- [ ] **FIX-04**: core.services 屬性加上 TypeScript @deprecated 標註（PlanetCore.ts:203）
- [ ] **FIX-05**: 修復 orbit-middleware-isolation.test.ts 中跳過的測試（必須在 FIX-01 之前完成）

### Exception 層級釐清

- [ ] **EXC-01**: AuthException（abstract base）和 AuthenticationException（concrete 401）的 JSDoc 清楚說明角色差異；保留兩個類別不刪除

### 模組組織

- [ ] **MOD-01**: 6 個 star export 轉為明確 named export（exceptions, helpers/data, helpers/errors, helpers/response, testing, adapters/bun）
- [ ] **MOD-02**: setApp() 從 index.ts 和 index.browser.ts 公開 export 中移除
- [ ] **MOD-03**: index.browser.ts 與 index.ts named export 變更保持同步

### 型別改善

- [ ] **TYPE-01**: ApplicationConfig 改為 extends Pick<GravitoConfig, 'logger' | 'config'> 消除欄位重複
- [ ] **TYPE-02**: Container.make() 新增 ServiceMap-keyed overload，回傳具體型別而非 any

### 文件與工具

- [ ] **DOC-01**: Biome noExplicitAny 從 warn 升級為 error
- [ ] **DOC-02**: Biome 新增 noConsole 規則（scope 限 packages/core/src/）
- [ ] **DOC-03**: publint 加入 CI pipeline 驗證 package.json exports map
- [ ] **DOC-04**: README EventManager API 段落同步為 dispatch/listen/unlisten
- [ ] **DOC-05**: README HookManager API 段落移除不存在的 setRetryScheduler
- [ ] **DOC-06**: 新增 orbit() vs register() vs use() 決策指南
- [ ] **DOC-07**: 公開 API JSDoc 統一使用英文

## Future Requirements (v2.2+)

### 型別深化

- **TYPE-03**: 公開 API 零 any（69 處，31 檔）
- **TYPE-04**: Container 完整 generic 重構（Container<TServices>）

### 錯誤體驗

- **ERR-01**: GravitoException 新增 suggestion field，提供 actionable 修復建議
- **ERR-02**: 改善 Container.make() / ConfigManager.get() / app() 錯誤訊息

### 文件強化

- **DOC-08**: 更新 canonical examples（ecommerce-mvc, blog-mvc, auth-verification）到 v2 API
- **DOC-09**: TypeDoc API reference site 建置
- **DOC-10**: Troubleshooting FAQ（5 entries）

## Out of Scope

| Feature | Reason |
|---------|--------|
| Satellite 包修改 | v2.1.0 僅改善 core 包 DX |
| Container 完整 generic 重構 | 影響 50+ 包所有 constructor，留給 v2.2 |
| 效能優化 | 留給 optimization milestone |
| GravitoVariables 型別改善 | 14 包 module augmentation 風險太高 |
| atlas grammar bare throws | query-builder 路徑，非 core 包範圍 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 21 | Pending |
| FIX-02 | Phase 21 | Pending |
| FIX-03 | Phase 24 | Pending |
| FIX-04 | Phase 21 | Pending |
| FIX-05 | Phase 21 | Pending |
| EXC-01 | Phase 22 | Pending |
| MOD-01 | Phase 23 | Pending |
| MOD-02 | Phase 23 | Pending |
| MOD-03 | Phase 23 | Pending |
| TYPE-01 | Phase 24 | Pending |
| TYPE-02 | Phase 25 | Pending |
| DOC-01 | Phase 26 | Pending |
| DOC-02 | Phase 26 | Pending |
| DOC-03 | Phase 26 | Pending |
| DOC-04 | Phase 26 | Pending |
| DOC-05 | Phase 26 | Pending |
| DOC-06 | Phase 26 | Pending |
| DOC-07 | Phase 26 | Pending |

**Coverage:**
- v2.1.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation — traceability complete*
