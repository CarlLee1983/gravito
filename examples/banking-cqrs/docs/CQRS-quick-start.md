# CQRS 快速入門（5 分鐘）

## 安裝和運行

### 1. 安裝依賴

```bash
cd examples/banking-cqrs
bun install
```

### 2. 啟動應用

```bash
bun run dev
```

應用將在 `http://localhost:3000` 啟動。

### 3. 測試 API

#### 建立帳戶

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H 'Content-Type: application/json' \
  -d '{
    "ownerName": "王小明",
    "currency": "TWD"
  }'

# 響應: { "success": true, "accountId": "uuid" }
```

儲存 `accountId` 以供後續使用。

#### 存款

```bash
curl -X POST http://localhost:3000/api/accounts/{accountId}/deposit \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 1000,
    "currency": "TWD"
  }'
```

#### 查詢餘額

```bash
curl http://localhost:3000/api/accounts/{accountId}/balance

# 響應:
# {
#   "success": true,
#   "data": {
#     "accountId": "...",
#     "ownerName": "王小明",
#     "balanceCents": 100000,
#     "balanceDollars": 1000,
#     "currency": "TWD",
#     "status": "active",
#     "createdAt": "2026-02-17T10:00:00.000Z"
#   }
# }
```

#### 提款

```bash
curl -X POST http://localhost:3000/api/accounts/{accountId}/withdraw \
  -H 'Content-Type: application/json' \
  -d '{ "amount": 200 }'
```

#### 轉帳

先建立第二個帳戶，然後：

```bash
curl -X POST http://localhost:3000/api/accounts/{fromAccountId}/transfer \
  -H 'Content-Type: application/json' \
  -d '{
    "toAccountId": "{toAccountId}",
    "amount": 300
  }'
```

#### 交易記錄

```bash
curl "http://localhost:3000/api/accounts/{accountId}/transactions?limit=10&offset=0"
```

## 關鍵檔案速查表

| 檔案 | 用途 |
|------|------|
| `src/Domain/` | 業務邏輯（Account, Money, Transaction） |
| `src/Application/Bus/` | CommandBus 和 QueryBus |
| `src/Application/Commands/` | 所有命令和處理器 |
| `src/Application/Queries/` | 所有查詢和處理器 |
| `src/Infrastructure/` | 資料庫和事件發布 |
| `src/Providers/CqrsProvider.ts` | 所有 Handler 的容器綁定 |
| `src/routes.ts` | HTTP 路由定義 |

## 新增一個 Command 的 3 步驟

### 1. 定義 Command

```typescript
// src/Application/Commands/MyCommand/MyCommand.ts
import type { Command } from '@gravito/enterprise'

export class MyCommand implements Command {
  constructor(readonly accountId: string) {}
}
```

### 2. 實現 Handler

```typescript
// src/Application/Commands/MyCommand/MyCommandHandler.ts
import type { CommandHandler } from '@gravito/enterprise'
import type { MyCommand } from './MyCommand'

export class MyCommandHandler implements CommandHandler<MyCommand, void> {
  constructor(
    private repository: IAccountRepository,
    private core: PlanetCore
  ) {}

  async handle(command: MyCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    // ... 業務邏輯
  }
}
```

### 3. 在 CqrsProvider 中註冊

```typescript
// src/Providers/CqrsProvider.ts
container.bind('cqrs.command.MyCommand', (c) =>
  new MyCommandHandler(
    c.make('banking.repository.account'),
    this.core!
  )
)
```

## 常見問題

### Q: CommandBus 和 QueryBus 有什麼區別？

**A:** 兩者結構相同，但語義不同：
- `CommandBus.dispatch()` - 執行改變狀態的操作
- `QueryBus.execute()` - 執行讀取操作

### Q: 為什麼要分離讀寫？

**A:** 主要優點：
1. 讀和寫有不同的性能要求（讀多寫少時）
2. 可以為讀模型建立專門優化的資料結構
3. 讀寫驗證規則不同
4. 未來可以輕易添加事件溯源

### Q: Domain Event 有什麼用？

**A:** Domain Event 記錄已發生的事件：
1. 審計日誌
2. 觸發其他系統的動作
3. 重建狀態（事件溯源）
4. 異步處理

### Q: 可以在 Query 中修改資料嗎？

**A:** 不應該。Query 應該完全是唯讀的。如果需要修改資料，使用 Command 代替。

### Q: 如何處理 Query 中的複雜邏輯？

**A:** 使用聚合查詢或專用的查詢物件：

```typescript
export class ComplexQuery implements Query {
  constructor(
    readonly filters: { dateFrom?: Date; dateTo?: Date; status?: string }
  ) {}
}
```

## 下一步

- 閱讀 [CQRS 概述](./CQRS-overview.md) 了解更多理論
- 查看 [架構說明](./architecture.md) 了解本專案結構
- 執行測試：`bun test`
- 探索原始碼，學習 CQRS 實踐

## 故障排除

### 連接資料庫失敗

確保 SQLite 已安裝且可寫入 `./data` 目錄。

### 帳戶未找到錯誤

確保帳戶已建立，並使用正確的 `accountId`。

### 餘額不足錯誤

帳戶餘額不足無法進行操作。先存款再試。
