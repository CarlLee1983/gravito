# DDD 模組類型決策指南

**完整版本**: Phase 2c Complete ✅
**最後更新**: 2026-03-10

---

## 概述

在建立 Gravito DDD 專案時，需要選擇適合的模組範本。本指南幫助您做出正確的決策。

---

## 📊 決策矩陣

### 按功能對比

| 功能需求 | Simple | Advanced | CQRS Query |
|---------|--------|----------|-----------|
| 基本 CRUD 操作 | ✅ | ✅ | ❌ (讀取專用) |
| 事件歷史記錄 | ❌ | ✅ | ✅ (訂閱) |
| 可變寫入模型 | ✅ | ❌ | ❌ |
| 反正規化查詢 | ❌ | ❌ | ✅ |
| 事件溯源 | ❌ | ✅ | ❌ |
| CQRS 模式 | ❌ | ❌ | ✅ |
| 最終一致性 | ❌ | ❌ | ✅ |
| 純投影函數 | ❌ | ❌ | ✅ |

### 按複雜度

| 指標 | Simple | Advanced | CQRS Query |
|------|--------|----------|-----------|
| 複雜度 | 🟢 低 | 🔴 高 | 🟡 中 |
| 學習曲線 | 🟢 簡單 | 🔴 困難 | 🟡 中等 |
| 實現時間 | 🟢 快 (1-2 天) | 🔴 慢 (3-5 天) | 🟡 中 (2-3 天) |
| 運維成本 | 🟢 低 | 🔴 高 | 🟡 中 |

---

## 🎯 選擇指南

### 選擇 Simple 如果...

✅ **您應該選擇 Simple 當**:

1. **剛開始學習 DDD**
   - 想要理解基本的聚合根、實體和值物件概念
   - 專注於域模型而不是基礎設施複雜性

2. **項目域模型簡單**
   - 單一聚合根（如：User, Product, Order）
   - 簡單的業務規則（沒有複雜的狀態機）
   - 基本的 CRUD 操作就足夠

3. **時間和資源有限**
   - 需要快速上市
   - 團隊規模小（1-3 人）
   - 預算限制

4. **業務需求**
   - 不需要完整的審計跟蹤
   - 狀態可以直接更新
   - 不需要事件重放

5. **已有的系統遷移**
   - 從單體應用遷移到 DDD
   - 先快速實現，後期可升級到 Advanced

**範例項目**:
```bash
# 部落格系統
bun create gravito-app blog-api --architecture ddd --ddd-type simple

# 待辦事項應用
bun create gravito-app todo-app --architecture ddd --ddd-type simple

# 簡單的用戶管理系統
bun create gravito-app user-api --architecture ddd --ddd-type simple
```

---

### 選擇 Advanced 如果...

✅ **您應該選擇 Advanced 當**:

1. **複雜的業務邏輯**
   - 多步驟的業務流程
   - 複雜的狀態轉移
   - 多個聚合根之間的互動（Sagas）

2. **需要完整審計跟蹤**
   - 金融交易（支付、轉帳）
   - 合規要求（GDPR、監管）
   - 完整的操作歷史

3. **事件驅動的系統**
   - 系統間的事件發布
   - 異步流程
   - 需要事件重放

4. **支付系統**
   - 交易必須完全可追蹤
   - 需要事件溯源支持
   - 異常恢復能力

5. **持續演化的域模型**
   - 業務規則經常改變
   - 需要時間溯源調試
   - A/B 測試需要重放歷史

6. **團隊成熟度高**
   - 有 DDD/Event Sourcing 經驗
   - 有時間學習和實現複雜模式
   - 充足的開發資源

**範例項目**:
```bash
# 支付系統
bun create gravito-app payment-system --architecture ddd --ddd-type advanced

# 電商訂單系統
bun create gravito-app orders-system --architecture ddd --ddd-type advanced

# 預訂系統（旅遊、酒店）
bun create gravito-app booking-system --architecture ddd --ddd-type advanced

# 金融交易平台
bun create gravito-app trading-platform --architecture ddd --ddd-type advanced
```

---

### 選擇 CQRS Query 如果...

✅ **您應該選擇 CQRS Query 當**:

1. **讀取性能是重點**
   - 大量查詢操作
   - 複雜的報表/分析
   - 高併發讀取

2. **結合 Advanced 模組**
   - Advanced 模組作為寫入端（命令）
   - CQRS Query 作為讀取端（查詢）
   - 事件在兩者之間流動

3. **需要反正規化的讀模型**
   - 多種不同的查詢視圖
   - 針對特定查詢優化的資料結構
   - 減少 JOIN 操作

4. **大數據量的分析**
   - 儀表板系統
   - BI 工具集成
   - 報表系統

5. **微服務架構**
   - 分離的讀寫服務
   - 獨立部署和擴展
   - 服務間通過事件通信

6. **團隊專業分工**
   - 不同團隊負責讀寫端
   - 不同的資料庫優化策略
   - 獨立的性能調優

**範例項目**:
```bash
# 首先建立寫入端（Advanced）
bun create gravito-app payment-write --architecture ddd --ddd-type advanced

# 然後建立讀取端（CQRS Query）
bun create gravito-app payment-read --architecture ddd --ddd-type cqrs-query

# 分析和報表服務
bun create gravito-app analytics --architecture ddd --ddd-type cqrs-query

# 儀表板後端
bun create gravito-app dashboard --architecture ddd --ddd-type cqrs-query
```

---

## 🚀 決策流程圖

```
開始
  │
  ├─ 是否需要事件完整歷史和審計？
  │  ├─ 是 → 考慮 Advanced
  │  └─ 否
  │
  ├─ 是否需要複雜的狀態管理或交易？
  │  ├─ 是 → Advanced 或 Simple?
  │  │  ├─ 簡單的 CRUD → Simple ✅
  │  │  └─ 複雜的業務流程 → Advanced ✅
  │  └─ 否
  │
  ├─ 是否主要是讀取操作且需要優化？
  │  ├─ 是 → CQRS Query ✅
  │  └─ 否
  │
  ├─ 團隊是否有 Event Sourcing 經驗？
  │  ├─ 是 → Advanced 或 Simple (團隊可選)
  │  └─ 否 → Simple (推薦)
  │
  └─ 時間緊張？
     ├─ 是 → Simple ✅ (快速實現)
     └─ 否 → Advanced 或 CQRS Query (選擇最佳)
```

---

## ⚠️ 常見陷阱

### 陷阱 1：過度工程化

❌ **不要做**:
```bash
# 為簡單的 CRUD 使用 Advanced Event Sourcing
bun create gravito-app simple-todo --architecture ddd --ddd-type advanced
```

✅ **應該做**:
```bash
# 簡單項目用 Simple
bun create gravito-app simple-todo --architecture ddd --ddd-type simple
```

**教訓**: 根據實際需要選擇，不要為了技術而使用複雜模式。

---

### 陷阱 2：混淆 CQRS Query 的用途

❌ **不要做**:
```bash
# CQRS Query 不能單獨作為完整應用
bun create gravito-app ecommerce --architecture ddd --ddd-type cqrs-query
# 然後期望有完整的寫入功能
```

✅ **應該做**:
```bash
# 建立寫入端（Advanced）
bun create gravito-app ecommerce-write --architecture ddd --ddd-type advanced

# 建立讀取端（CQRS Query）
bun create gravito-app ecommerce-read --architecture ddd --ddd-type cqrs-query

# 兩個服務通過事件通信
```

**教訓**: CQRS Query 是讀取專用，需要配合寫入端使用。

---

### 陷阱 3：低估 Advanced 的複雜性

❌ **不要做**:
```bash
# 高估團隊能力
bun create gravito-app complex-system --architecture ddd --ddd-type advanced
# 假設短時間內能掌握 Event Sourcing
```

✅ **應該做**:
```bash
# 逐步採用
bun create gravito-app complex-system --architecture ddd --ddd-type simple

# 團隊學習 Event Sourcing
# 在擴展模組時升級為 Advanced
```

**教訓**: Advanced 需要時間和經驗，不要急著採用。

---

## 📋 檢查清單

### 選擇 Simple 前檢查

- [ ] 域模型是否簡單（< 3 個聚合根）？
- [ ] 業務規則是否簡單（< 5 個複雜規則）？
- [ ] 不需要完整審計歟?
- [ ] 團隊是否仍在學習 DDD？
- [ ] 時間/預算有限？

如果上述大多數是 ✅，選擇 **Simple**。

---

### 選擇 Advanced 前檢查

- [ ] 是否需要完整的事件歷史？
- [ ] 是否有複雜的狀態機？
- [ ] 是否需要支付/金融級別的可靠性？
- [ ] 是否需要異步事件流？
- [ ] 團隊是否有 Event Sourcing 經驗？

如果 3 個以上是 ✅，選擇 **Advanced**。

---

### 選擇 CQRS Query 前檢查

- [ ] 是否結合 Advanced 模組？
- [ ] 讀寫比例是否不均衡（讀多寫少）？
- [ ] 是否需要多種不同的查詢視圖？
- [ ] 是否有大數據量的分析？
- [ ] 是否需要獨立的讀寫服務？

如果 3 個以上是 ✅，選擇 **CQRS Query**。

---

## 🔄 升級路徑

### Simple → Advanced

當需要升級時：

```bash
# 第一步：備份現有項目
cp -r simple-project simple-project-backup

# 第二步：建立新的 Advanced 版本
bun create gravito-app simple-project-advanced \
  --architecture ddd \
  --ddd-type advanced

# 第三步：遷移代碼
# 複製業務邏輯
# 添加事件定義
# 實現事件應用器
```

---

### Simple → CQRS Query + Advanced

微服務化遷移：

```bash
# 建立 Advanced 寫入服務
bun create gravito-app my-service-write \
  --architecture ddd \
  --ddd-type advanced

# 建立 CQRS Query 讀取服務
bun create gravito-app my-service-read \
  --architecture ddd \
  --ddd-type cqrs-query

# 配置事件發布/訂閱
# 遷移現有資料
```

---

## 📚 進一步學習

### Simple 推薦資源
- 《Domain-Driven Design》- Eric Evans (基礎章節)
- Gravito 官方 DDD 教程
- 聚合根和實體的最佳實踐

### Advanced 推薦資源
- 《Domain-Driven Design》- 完整閱讀
- Event Sourcing 設計模式
- Saga 模式實現
- 時間驅動架構

### CQRS Query 推薦資源
- CQRS 設計模式
- 事件投影技術
- 最終一致性管理
- 微服務間通信

---

## 🆘 常見問題

### Q1: 我可以在以後改變模組類型嗎？

**A**: 可以，但有成本：
- **Simple → Advanced**: 需要重構以支持事件溯源（中等工作量）
- **Advanced → Simple**: 需要移除事件溯源（高工作量）
- **Simple/Advanced → CQRS Query**: 需要分離讀寫模型（中等工作量）

**推薦**: 在開始時就選擇正確的類型。

---

### Q2: 小團隊應該選哪個？

**A**: 建議：
- **1 人** → Simple（快速原型）
- **2-3 人** → Simple 或 Advanced（根據複雜度）
- **4+ 人** → Advanced 或 CQRS Query（可分工合作）

---

### Q3: 可以混合使用不同的類型嗎？

**A**: 是的！最佳實踐：
```bash
# 微服務架構中
- payment-service (Advanced - 複雜的支付邏輯)
- inventory-service (Simple - 簡單庫存管理)
- analytics-service (CQRS Query - 讀取優化)
```

---

## 📞 獲得幫助

遇到選擇困難？

1. 閱讀完整的 CLI 使用範例 → `CLI_USAGE_EXAMPLES.md`
2. 查看 DDD 實現指南 → `DDD_MODULE_TYPE_SELECTION.md`
3. 參考項目架構文檔 → `ARCHITECTURE.md`
4. 檢查示例項目代碼

---

**記住**: 沒有完全正確的選擇，只有最適合當前情況的選擇。隨著項目發展，您可以進行升級和重構。

Built with ❤️ using Gravito Framework + Claude Code
