# 🏦 銀行 CQRS 範例專案

一個展示 **CQRS（Command Query Responsibility Segregation）** 模式在 Gravito 框架中的實踐範例。

## 特性

- ✅ **完整 CQRS 實現** - CommandBus、QueryBus、Handler 的清晰分離
- ✅ **領域驅動設計** - AggregateRoot、ValueObject、Entity、DomainEvent
- ✅ **業務規則實施** - 金額驗證、轉帳限制、帳戶狀態管理
- ✅ **事件驅動架構** - 領域事件發布和處理
- ✅ **完整測試覆蓋** - 單元測試和集成測試
- ✅ **詳細文檔** - CQRS 理論、快速入門、架構說明

## 快速開始

### 安裝

```bash
cd examples/banking-cqrs
bun install
```

### 運行

```bash
# 開發模式（含 watch）
bun run dev

# 構建
bun run build

# 測試
bun test

# 型別檢查
bun run typecheck
```

### 測試 API

```bash
# 建立帳戶
curl -X POST http://localhost:3000/api/accounts \
  -H 'Content-Type: application/json' \
  -d '{"ownerName": "王小明", "currency": "TWD"}'

# 存款
curl -X POST http://localhost:3000/api/accounts/{accountId}/deposit \
  -H 'Content-Type: application/json' \
  -d '{"amount": 1000}'

# 查詢餘額
curl http://localhost:3000/api/accounts/{accountId}/balance

# 提款
curl -X POST http://localhost:3000/api/accounts/{accountId}/withdraw \
  -H 'Content-Type: application/json' \
  -d '{"amount": 200}'

# 交易記錄
curl "http://localhost:3000/api/accounts/{accountId}/transactions"
```

詳見[快速入門指南](./docs/CQRS-quick-start.md)。

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/accounts` | 建立帳戶（Command） |
| GET | `/api/accounts/:id` | 取得帳戶詳情（Query） |
| GET | `/api/accounts/:id/balance` | 查詢餘額（Query） |
| POST | `/api/accounts/:id/deposit` | 存款（Command） |
| POST | `/api/accounts/:id/withdraw` | 提款（Command） |
| POST | `/api/accounts/:id/transfer` | 轉帳（Command） |
| GET | `/api/accounts/:id/transactions` | 交易記錄（Query） |

## 專案結構

```
src/
├── Domain/              # 領域層（業務規則）
│   ├── Account/         # 帳戶聚合根
│   ├── Transaction/     # 交易記錄
│   └── Shared/          # 共享值對象（Money）
├── Application/         # 應用層（協調）
│   ├── Bus/             # CommandBus、QueryBus
│   ├── Commands/        # 命令及處理器
│   └── Queries/         # 查詢及處理器
├── Infrastructure/      # 基礎設施層（外部依賴）
│   ├── Persistence/     # Repository 實現
│   └── EventPublisher/  # 事件發布
├── Providers/           # 服務提供者
├── routes.ts            # HTTP 路由
└── index.ts             # 入口點

tests/
├── Domain/              # 領域層單元測試
└── setup.ts             # 測試工具

docs/
├── CQRS-overview.md     # CQRS 理論與模式
├── CQRS-quick-start.md  # 5 分鐘上手
└── architecture.md      # 本專案架構
```

## 核心概念

### CQRS

**Command（命令）** - 改變狀態的操作
```typescript
class DepositFundsCommand {
  constructor(
    readonly accountId: string,
    readonly amountCents: number,
    readonly currency: string = 'TWD'
  ) {}
}
```

**Query（查詢）** - 讀取狀態的操作
```typescript
class GetAccountBalanceQuery {
  constructor(readonly accountId: string) {}
}
```

### Domain-Driven Design

**AggregateRoot（聚合根）** - 業務邏輯的中心
```typescript
const account = Account.create('acc-1', '王小明', 'TWD')
account.deposit(new Money(10000, 'TWD'))
account.withdraw(new Money(3000, 'TWD'))
account.transferTo('acc-2', new Money(2000, 'TWD'))
```

**ValueObject（值對象）** - 不可變的業務值
```typescript
const money = new Money(10000, 'TWD')  // 100 元
money.add(new Money(5000, 'TWD'))      // 150 元
money.isGreaterThan(new Money(8000, 'TWD'))  // true
```

**DomainEvent（領域事件）** - 已發生的事實
```typescript
const account = Account.create('acc-1', 'John', 'TWD')
const events = account.pullDomainEvents()
// [AccountCreated]

account.deposit(new Money(10000, 'TWD'))
const events = account.pullDomainEvents()
// [FundsDeposited]
```

## 業務規則

### Account（帳戶）

- 帳戶有三種狀態：`active`（活躍）、`frozen`（凍結）、`closed`（已關閉）
- 只有 `active` 帳戶才能進行交易
- 帳戶餘額不能為負數
- 單次轉帳不能超過 100,000 元

### Transaction（交易記錄）

- 每筆交易記錄帳戶操作
- 包含類型：deposit、withdrawal、transfer_in、transfer_out
- 記錄操作前後的餘額

### Money（金額）

- 內部以分為單位存儲（避免浮點誤差）
- 支持加法、減法、比較操作
- 強制貨幣一致性

## 測試

### 單元測試

```bash
bun test tests/Domain/
```

測試領域層邏輯，無數據庫依賴。

### 集成測試

```bash
bun test tests/Integration/
```

測試完整的 CQRS 流程。

### 測試覆蓋

目標：≥ 80% 代碼覆蓋率

## 文檔

- [CQRS 概述](./docs/CQRS-overview.md) - 深入理解 CQRS 模式
- [快速入門](./docs/CQRS-quick-start.md) - 5 分鐘上手
- [架構說明](./docs/architecture.md) - 本專案架構詳解

## 技術棧

- **框架**: Gravito
- **語言**: TypeScript
- **資料庫**: SQLite（開發）/ PostgreSQL（生產）
- **測試**: Bun test
- **工具**: Bun, Turbo, Biome

## 架構優點

✅ **職責分離** - Domain、Application、Infrastructure 各司其職
✅ **易於測試** - Domain 層零依賴，快速單元測試
✅ **可擴展** - 新增 Command/Query 只需 3 步
✅ **事件驅動** - 領域事件完整記錄所有操作
✅ **性能優化** - 讀寫分離為未來優化奠基

## 擴展方向

### P1 - 基礎實施（已完成）
- ✅ Account AggregateRoot
- ✅ CQRS Bus 實現
- ✅ 基本 Commands/Queries

### P2 - 進階特性
- 用戶認證與授權
- 交易審核工作流
- 每日交易限制

### P3 - 優化與監控
- 讀模型快取（Redis）
- 事件溯源
- 監控和指標

## 最佳實踐

✅ **Keep Domain Layer Pure** - 零框架依賴
✅ **Write Thin Handlers** - 協調而非業務邏輯
✅ **Queries Are Read-Only** - 永遠不修改資料
✅ **Publish Domain Events** - 完整的事件記錄
✅ **Use DTOs for Queries** - 不暴露 Domain 對象
✅ **Test Thoroughly** - 特別是領域層

## 常見問題

**Q: CQRS 何時使用？**
A: 當讀寫操作複雜度差異大、需要不同優化策略、或實施事件驅動時。

**Q: Domain Event 有什麼用？**
A: 記錄審計日誌、觸發其他系統、實現事件溯源。

**Q: 可以在 Query 中修改資料嗎？**
A: 不應該。如需修改使用 Command。

**Q: 如何處理複雜查詢？**
A: 使用聚合查詢或專用的查詢物件。

## 參考資源

- [Martin Fowler - CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design)
- [Gravito Framework](https://github.com/gravito-framework/gravito)

## 貢獻

歡迎提交 Issue 和 PR！

## 許可

MIT License - 請詳見 [LICENSE](../../LICENSE) 檔案。

---

**建立者**: Gravito Team
**最後更新**: 2026-02-17
