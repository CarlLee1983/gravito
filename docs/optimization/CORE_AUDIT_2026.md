# packages/core/ 核心效能與架構審查報告 (2026)

**報告狀態**: 審查完成 (2026-01-16)
**比對基準**: `.claude/core-optimization-audit-report.md`
**維護者**: Antigravity Architect

---

## 📊 總體摘要

| 類別 | 總問題數 | ✅ 已解決 | ⚠️ 部分解決 | ❌ 未解決 |
|------|---------|----------|-------------|----------|
| 🔴 優先級 1 (Critical) | 3 | 2 | 0 | 1 |
| 🟡 優先級 2 (High) | 3 | 0 | 1 | 2 |
| 🟢 優先級 3 (Medium) | 3 | 1 | 0 | 2 |
| **總計** | **9** | **3** | **1** | **5** |

**完成度**: 33% 已解決，11% 部分解決，56% 未解決。這項審查標誌著 **Phase 5：核心邏輯與技術債清理** 的進行中，已完成**里程碑 1**。

---

## 🔴 優先級 1：關鍵問題 (Critical)

### 1.1 ~~Route.ts 中的 `any` 類型使用~~ (✅ 已解決)
**狀況**: 嚴重影響 DX 與類型安全。
- `Route.get()`, `post()`, `put()` 等方法中的 `requestOrHandler` 和 `handler` 參數使用 `any`。
- Middleware 定義使用 `any[]`。
**解決方案**: 引入 `RouteDefinitionArg` (\`FormRequestClass | RouteHandler | GravitoMiddleware | GravitoMiddleware[]\`) 取代散落的型別轉換，完全消滅 `any`，顯著提升了 DX 安全性。

### 1.2 FormRequest 每次請求都實例化
**狀況**: 效能瓶頸。
- `Router.ts` 在每次 HTTP 請求時都會 `new RequestClass()`。
- 增加 GC 壓力，高並發下效能損失明顯。
**建議**: 實現 `WeakMap` 緩存機制，將無狀態的 FormRequest 實例化一次後複用。

### 1.3 ~~HTTP 方法實現大量重複~~ (✅ 已解決)
**狀況**: 維護成本極高。
- `Router`, `RouteGroup`, `Route` 三個類別中重複實現了 5 個 HTTP 動態方法。
- 重複代碼約 265 行。
**解決方案**: 使用 `RoutingMethods` 介面聲明類型，並在執行期動態為 Prototype 掛載 proxy 方法，刪除超過 100 行冗餘實作代碼。

---

## 🟡 優先級 2：高優先級 (High)

### 2.1 Application Container 不一致
**狀況**: DI 容器混亂。
- `Application` 創建了一個 `Container`，但內部的 `PlanetCore` 又創建了另一個。
- 服務註冊可能在不同容器間失聯。
**建議**: 強制 `Application` 將其容器注入 `PlanetCore` 實現共享。

### 2.2 Catch Blocks 缺少 Type Guards
**狀況**: 錯誤診斷困難。
- `Router.ts` 中的 `catch { ... }` 塊未補捉錯誤對象。
- `Application.ts` 中捕捉了 `err` 但未進行類型判斷，導致日誌資訊有限。
**建議**: 使用 `instanceof` 或 Type Guards 進行更精確的錯誤處理。

### 2.3 路由編譯 O(n²) 算法
**狀況**: 大規模路徑集下的效能風險。
- 在 `Router.compile()` 中使用了過時的雙重循環比對。
**建議**: 使用 `Set` 進行 O(1) 查找，將編譯效能提升 100x+。

---

## 🟢 優先級 3：中等優先級 (Medium)

### 3.1 Cookie 解析邏輯重複
- `Csrf.ts` 中手動實現了 `parseCookies`。
- 應提取至 `CookieJar` 統一管理。

### 3.2 ~~PhotonAdapter 中的 `any` 類型~~ (✅ 已解決)
- Proxy 物件與目標適配器之間使用了大量的 `as any` 強轉。
- **解決方案**: 引入 `ResettableContext` 類型以安全強型別包裹 GravitoContext 與 PhotonContext 的生命週期。

### 3.3 測試覆蓋率提升
- 目前核心覆蓋率約 23%，預期標杆為 35%+。
- 缺少命名路由 URL 生成、Provider 載入失敗場景的單元測試。

---

## 🎯 Phase 5 優化路線圖 (Upcoming)

1.  ~~**里程碑 1**: 類型安全與 DX 強化（修復 `any` 與重載）。~~ (完成)
2.  **里程碑 2**: 核心效能重構（FormRequest 緩存、O(1) 路由編譯）。
3.  **里程碑 3**: 架構一致性（容器共享、代碼去重）。
4.  **里程碑 4**: 穩定性加固（Type Guards、測試覆蓋率提升）。

---

*最後修改：2026-02-26*
