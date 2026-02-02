# Framework Issues Discovery Log

在搶購系統開發過程中發現的 Gravito 框架問題與改進機會。

此文檔由搶購系統的「吃自己狗糧」開發持續更新。

---

## 格式規範

每個發現應包含：

```markdown
## Issue: [簡短標題]

- **發現時間**：Week X, Day Y
- **嚴重性**：Critical / High / Medium / Low
- **狀態**：未處理 / 已立項 / 開發中 / 已修正
- **相關代碼**：examples/flash-sale-fullstack/src/...
- **描述**：問題詳細說明
- **影響**：對搶購系統的影響
- **臨時解決方案**：如何繞過此問題
- **改進方案**：在框架層面的解決方案
- **優先級**：即刻修復 / Phase 2 / Phase 3 / 後期優化
- **相關 PR/Commit**：(修正後填入)

---
```

## 待發現

以下是預期可能會發現的問題類別，實際發現後會更新此文檔。

### 預期會遇到的問題

#### 1. 分佈式鎖機制
- **預計發現時間**：Week 3
- **預期嚴重性**：High
- **狀態**：⏳ 待發現

#### 2. Event System 高頻性能
- **預計發現時間**：Week 3-4
- **預期嚴重性**：High
- **狀態**：⏳ 待發現

#### 3. 資料庫連接池管理
- **預計發現時間**：Week 5
- **預期嚴重性**：Medium
- **狀態**：⏳ 待發現

#### 4. 限流與速率限制
- **預計發現時間**：Week 3
- **預期嚴重性**：High
- **狀態**：⏳ 待發現

#### 5. 異常事件重試機制
- **預計發現時間**：Week 4
- **預期嚴重性**：Medium
- **狀態**：⏳ 待發現

---

## 已發現的問題

(此部分在開發過程中持續填充)

### 已完成的修正

(此部分記錄已解決的問題與相應的框架改進)

---

## 追蹤統計

| 狀態 | 數量 |
|------|------|
| 🔴 Critical (即刻修復) | 0 |
| 🟠 High (下週修復) | 0 |
| 🟡 Medium (下月修復) | 0 |
| 🟢 Low (後期優化) | 0 |
| ✅ 已修正 | 0 |

---

## 開發時間線

```
Week 1-2 (MVP)
  └─ 預期發現：少量 (基礎功能)

Week 3-5 (高併發)
  └─ 預期發現：大量 (架構層問題)

Week 6-7 (性能優化)
  └─ 預期發現：中等 (性能瓶頸)

Week 8 (文檔)
  └─ 最終歸納與優先級排序
```

---

## 如何使用此文檔

### 開發中新發現問題

1. 在相關源代碼中添加 TODO comment
   ```typescript
   // TODO: Framework Issue - High Priority
   // Issue: 需要分佈式鎖支持
   // Ref: FRAMEWORK_ISSUES.md
   ```

2. 在此文檔中新增條目

3. 記錄到相應的週次

### 修正框架問題

1. 在框架代碼中修正
2. 在相應的 commit message 中引用
   ```
   fix: [core] Add distributed lock support

   Discovered during flash-sale development (Week 3).
   Fixes: FRAMEWORK_ISSUES.md - Issue 1
   ```

3. 更新此文檔的狀態為「已修正」

---

## 預期的改進機會

根據搶購系統的需求，以下是可能需要加入 Gravito 框架的新功能：

### 新 Packages 候選清單

- [ ] `@gravito/distributed-lock` - 分佈式鎖
- [ ] `@gravito/rate-limiter` - 速率限制
- [ ] `@gravito/event-priority` - 事件優先級系統
- [ ] `@gravito/async-retry` - 非同步重試機制
- [ ] `@gravito/telemetry` - 可觀測性（metrics、tracing）

### 現有 Package 的潛在改進

- [ ] `@gravito/core` - Container 性能優化？
- [ ] `@gravito/signal` - Event 系統性能優化？
- [ ] `@gravito/atlas` - 連接池管理增強？
- [ ] `@gravito/stasis` - 快取策略增強？

---

## 聯繫與討論

新發現的問題應在以下位置討論：

1. **代碼中**：相關源文件的 TODO 註解
2. **此文檔**：FRAMEWORK_ISSUES.md
3. **框架 Issue**：gravito-core-ci-fix 中的 GitHub Issues（如果計畫整合）

---

## 版本控制

| 版本 | 日期 | 更新 |
|------|------|------|
| v0.1 | 2026-02-02 | 初始建立，待發現 |

---

**最後更新**：2026-02-02
**維護者**：搶購系統開發團隊
