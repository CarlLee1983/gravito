# 📚 API 完整文檔

本文檔提供所有 HTTP API 端點的詳細參考，包括請求格式、響應格式、錯誤處理和使用示例。

## 🎯 API 基本信息

- **基礎 URL**：`http://localhost:3000`
- **內容類型**：`application/json`
- **所有請求都是同步的**（命令立即返回，異步事件在後台處理）

## 🏥 健康檢查

### 檢查服務狀態

```http
GET /api/health
```

**响應示例** (200 OK)：

```json
{
  "status": "ok",
  "timestamp": "2024-02-21T10:30:00Z",
  "service": "banking-event-driven"
}
```

---

## 👤 帳戶管理端點

### 1️⃣ 創建帳戶

開設一個新的銀行帳戶。

```http
POST /api/accounts
Content-Type: application/json

{
  "ownerId": "user-123",
  "ownerName": "Alice Johnson",
  "currency": "TWD",
  "initialDepositCents": 100000
}
```

**請求字段**：

| 字段 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `ownerId` | string | ✅ | 帳戶所有者的 ID |
| `ownerName` | string | ✅ | 所有者姓名 (1-100 字符) |
| `currency` | string | ✅ | 幣種 (如 TWD, USD) |
| `initialDepositCents` | number | ✅ | 初始存款 (單位：分，> 0) |

**成功响應** (201 Created)：

```json
{
  "success": true,
  "data": {
    "id": "account-550e8400-e29b-41d4-a716-446655440000",
    "ownerId": "user-123",
    "ownerName": "Alice Johnson",
    "balanceCents": 100000,
    "status": "active",
    "currency": "TWD",
    "createdAt": "2024-02-21T10:30:00Z"
  }
}
```

**錯誤响應** (400 Bad Request)：

```json
{
  "success": false,
  "error": "Validation error: initialDepositCents must be greater than 0"
}
```

**事件鏈**：
```
OpenAccountCommand
  ↓
Account.open() → AccountOpened
  ↓
EventManager分發
  ↓
UpdateReadModelListener → AccountReadModel.addAccount()
SSEManager → 推送到前端
```

---

### 2️⃣ 獲取所有帳戶

列表查詢所有帳戶。

```http
GET /api/accounts
```

**查詢參數**：無

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": [
    {
      "id": "account-550e8400-e29b-41d4-a716-446655440000",
      "ownerId": "user-123",
      "ownerName": "Alice Johnson",
      "balanceCents": 100000,
      "status": "active",
      "currency": "TWD",
      "createdAt": "2024-02-21T10:30:00Z"
    },
    {
      "id": "account-7a5c9f2b-1e3f-4d7a-8c2e-9b4f1a3d5c7e",
      "ownerId": "user-456",
      "ownerName": "Bob Smith",
      "balanceCents": 50000,
      "status": "active",
      "currency": "USD",
      "createdAt": "2024-02-21T10:35:00Z"
    }
  ],
  "total": 2
}
```

---

### 3️⃣ 獲取帳戶詳情

根據帳戶 ID 獲取詳細信息。

```http
GET /api/accounts/:id
```

**路徑參數**：

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | string | 帳戶 ID |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "id": "account-550e8400-e29b-41d4-a716-446655440000",
    "ownerId": "user-123",
    "ownerName": "Alice Johnson",
    "balanceCents": 100000,
    "status": "active",
    "currency": "TWD",
    "createdAt": "2024-02-21T10:30:00Z"
  }
}
```

**錯誤响應** (404 Not Found)：

```json
{
  "success": false,
  "error": "Account not found"
}
```

---

### 4️⃣ 獲取帳戶餘額

快速查詢帳戶的當前餘額。

```http
GET /api/accounts/:id/balance
```

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "balanceCents": 100000,
    "currency": "TWD"
  }
}
```

---

### 5️⃣ 存款

向帳戶存款。

```http
POST /api/accounts/:id/deposit
Content-Type: application/json

{
  "amountCents": 50000
}
```

**請求字段**：

| 字段 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `amountCents` | number | ✅ | 存款金額 (單位：分，> 0) |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "amountCents": 50000,
    "newBalanceCents": 150000
  }
}
```

**錯誤响應** (400 Bad Request)：

```json
{
  "success": false,
  "error": "Account is frozen, operation not allowed"
}
```

**事件鏈**：
```
DepositMoneyCommand
  ↓
Account.deposit() → MoneyDeposited
  ↓
UpdateReadModelListener → 更新 balance
TransactionReadModel → 記錄交易
SSEManager → 推送事件
```

---

### 6️⃣ 提款

從帳戶提款。

```http
POST /api/accounts/:id/withdraw
Content-Type: application/json

{
  "amountCents": 30000
}
```

**請求字段**：

| 字段 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `amountCents` | number | ✅ | 提款金額 (單位：分，> 0，≤ 餘額) |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "amountCents": 30000,
    "newBalanceCents": 70000
  }
}
```

**錯誤响應** (400 Bad Request)：

```json
{
  "success": false,
  "error": "Insufficient funds: Current balance 50000, needed 100000"
}
```

---

### 7️⃣ 凍結帳戶

凍結帳戶，禁止所有交易。

```http
POST /api/accounts/:id/freeze
Content-Type: application/json

{
  "reason": "Suspected fraudulent activity"
}
```

**請求字段**：

| 字段 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `reason` | string | ❌ | 凍結原因 (可選) |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "status": "frozen",
    "reason": "Suspected fraudulent activity"
  }
}
```

**錯誤响應** (400 Bad Request)：

```json
{
  "success": false,
  "error": "Account is already frozen"
}
```

---

### 8️⃣ 解凍帳戶

解凍帳戶，恢復交易能力。

```http
POST /api/accounts/:id/unfreeze
Content-Type: application/json

{}
```

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "status": "active"
  }
}
```

---

## 💸 轉帳端點

### 1️⃣ 發起轉帳

在兩個帳戶之間轉帳。

```http
POST /api/transfers
Content-Type: application/json

{
  "fromAccountId": "account-550e8400-e29b-41d4-a716-446655440000",
  "toAccountId": "account-7a5c9f2b-1e3f-4d7a-8c2e-9b4f1a3d5c7e",
  "amountCents": 20000
}
```

**請求字段**：

| 字段 | 類型 | 必須 | 說明 |
|------|------|------|------|
| `fromAccountId` | string | ✅ | 源帳戶 ID |
| `toAccountId` | string | ✅ | 目標帳戶 ID |
| `amountCents` | number | ✅ | 轉帳金額 (單位：分，> 0) |

**成功响應** (202 Accepted)：

```json
{
  "success": true,
  "data": {
    "transferId": "transfer-a1b2c3d4-e5f6-4789-0abc-def123456789",
    "status": "initiated",
    "fromAccountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "toAccountId": "account-7a5c9f2b-1e3f-4d7a-8c2e-9b4f1a3d5c7e",
    "amountCents": 20000
  }
}
```

**說明**：轉帳是異步的。API 立即返回 `transferId`，實際轉帳通過 Saga 在後台進行。

**Saga 步驟**：
1. ✅ `TransferInitiated` - 轉帳已發起
2. ✅ `TransferDebitApplied` - 源帳戶已扣款
3. ✅ `TransferCreditApplied` - 目標帳戶已入款
4. ✅ `TransferCompleted` - 轉帳已完成

**失敗狀態**：如果 Saga 任何步驟失敗，`TransferFailed` 事件會發出，並自動進行補償。

**事件鏈**：

```
POST /api/transfers
  ↓
TransferController.initiateTransfer()
  ↓
InitiateTransferCommand
  ↓
Account.initiateTransfer() → TransferInitiated
  ↓
Saga Step 1: handleTransferInitiated()
  ├─ Account.applyTransferDebit() → TransferDebitApplied
  ↓
Saga Step 2: handleTransferDebitApplied()
  ├─ Account.applyTransferCredit() → TransferCreditApplied
  ↓
Saga Step 3: handleTransferCreditApplied()
  ├─ TransferCompleted
  ↓
用戶通過 SSE 訂閱接收進度更新
```

---

### 2️⃣ 查詢轉帳狀態

根據轉帳 ID 查詢轉帳的當前狀態。

```http
GET /api/transfers/:id
```

**路徑參數**：

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | string | 轉帳 ID |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": {
    "transferId": "transfer-a1b2c3d4-e5f6-4789-0abc-def123456789",
    "status": "completed",
    "fromAccountId": "account-550e8400-e29b-41d4-a716-446655440000",
    "toAccountId": "account-7a5c9f2b-1e3f-4d7a-8c2e-9b4f1a3d5c7e",
    "amountCents": 20000,
    "createdAt": "2024-02-21T10:30:00Z",
    "completedAt": "2024-02-21T10:30:05Z"
  }
}
```

**可能的狀態**：
- `initiated` - 轉帳已發起，正在處理
- `debit_applied` - 源帳戶已扣款
- `credit_applied` - 目標帳戶已入款
- `completed` - 轉帳已完成
- `failed` - 轉帳失敗（已補償）

---

## 📊 交易歷史端點

### 獲取帳戶的交易歷史

```http
GET /api/accounts/:id/transactions
```

**查詢參數**：

| 參數 | 類型 | 說明 |
|------|------|------|
| `limit` | number | 返回結果數量 (默認：50，最大：500) |
| `offset` | number | 偏移量 (默認：0) |

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": [
    {
      "id": "event-1",
      "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
      "type": "deposit",
      "amountCents": 50000,
      "timestamp": "2024-02-21T10:30:00Z"
    },
    {
      "id": "event-2",
      "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
      "type": "transfer_debit",
      "amountCents": 20000,
      "transferId": "transfer-a1b2c3d4-e5f6-4789-0abc-def123456789",
      "timestamp": "2024-02-21T10:35:00Z"
    },
    {
      "id": "event-3",
      "accountId": "account-550e8400-e29b-41d4-a716-446655440000",
      "type": "withdrawal",
      "amountCents": 10000,
      "timestamp": "2024-02-21T10:40:00Z"
    }
  ],
  "total": 3
}
```

**交易類型**：

| 類型 | 說明 |
|------|------|
| `deposit` | 存款 |
| `withdrawal` | 提款 |
| `transfer_debit` | 轉帳扣款 |
| `transfer_credit` | 轉帳入款 |
| `transfer_completed` | 轉帳完成標記 |
| `transfer_failed` | 轉帳失敗標記 |

---

## 📡 實時事件流 (SSE)

### 訂閱實時事件

```http
GET /api/events/stream
```

**連接類型**：Server-Sent Events (SSE) - 長連接

**響應頭**：
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**事件格式**：

```
event: AccountOpened
data: {"aggregateId":"account-123","payload":{...},"timestamp":"2024-02-21T10:30:00Z"}

event: MoneyDeposited
data: {"aggregateId":"account-123","payload":{"amountCents":5000,"newBalanceCents":15000},"timestamp":"2024-02-21T10:30:01Z"}

event: TransferInitiated
data: {"aggregateId":"account-123","payload":{"transferId":"transfer-456",...},"timestamp":"2024-02-21T10:30:02Z"}
```

**可用事件**：
- `AccountOpened` - 帳戶打開
- `MoneyDeposited` - 金錢存入
- `MoneyWithdrawn` - 金錢提出
- `AccountFrozen` - 帳戶凍結
- `AccountUnfrozen` - 帳戶解凍
- `TransferInitiated` - 轉帳發起
- `TransferDebitApplied` - 轉帳扣款
- `TransferCreditApplied` - 轉帳入款
- `TransferCompleted` - 轉帳完成
- `TransferFailed` - 轉帳失敗

**前端示例**：

```javascript
// 連接到事件流
const eventSource = new EventSource('http://localhost:3000/api/events/stream')

// 監聽帳戶打開事件
eventSource.addEventListener('AccountOpened', (e) => {
  const { aggregateId, payload } = JSON.parse(e.data)
  console.log(`Account ${aggregateId} opened with balance ${payload.initialBalanceCents}`)
})

// 監聽存款事件
eventSource.addEventListener('MoneyDeposited', (e) => {
  const { aggregateId, payload } = JSON.parse(e.data)
  console.log(`Deposited ${payload.amountCents} to account ${aggregateId}`)
})

// 監聽轉帳事件
eventSource.addEventListener('TransferCompleted', (e) => {
  const { payload } = JSON.parse(e.data)
  console.log(`Transfer ${payload.transferId} completed!`)
})

// 錯誤處理
eventSource.onerror = () => {
  console.error('Connection lost, reconnecting...')
}
```

---

## 🚨 死信隊列 (DLQ)

### 查詢失敗事件

```http
GET /api/dlq
```

**成功响應** (200 OK)：

```json
{
  "success": true,
  "data": [
    {
      "eventType": "TransferFailed",
      "aggregateId": "account-550e8400-e29b-41d4-a716-446655440000",
      "payload": {
        "transferId": "transfer-a1b2c3d4-e5f6-4789-0abc-def123456789",
        "fromAccountId": "account-550e8400-e29b-41d4-a716-446655440000",
        "toAccountId": "account-7a5c9f2b-1e3f-4d7a-8c2e-9b4f1a3d5c7e",
        "amountCents": 20000,
        "reason": "Insufficient funds for transfer"
      },
      "timestamp": "2024-02-21T10:30:05Z"
    }
  ],
  "total": 1
}
```

---

## 🔄 完整工作流示例

### 1. 創建兩個帳戶

```bash
# 帳戶 1：Alice
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-1",
    "ownerName": "Alice",
    "currency": "TWD",
    "initialDepositCents": 100000
  }'

# 回應：
# {
#   "success": true,
#   "data": {
#     "id": "account-alice",
#     "balanceCents": 100000,
#     ...
#   }
# }

# 帳戶 2：Bob
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-2",
    "ownerName": "Bob",
    "currency": "TWD",
    "initialDepositCents": 50000
  }'

# 回應：
# {
#   "success": true,
#   "data": {
#     "id": "account-bob",
#     "balanceCents": 50000,
#     ...
#   }
# }
```

### 2. 訂閱實時事件

```bash
# 在另一個終端開啟 SSE 連接
curl -N http://localhost:3000/api/events/stream
```

### 3. 執行轉帳

```bash
curl -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "account-alice",
    "toAccountId": "account-bob",
    "amountCents": 30000
  }'

# 回應：
# {
#   "success": true,
#   "data": {
#     "transferId": "transfer-123",
#     "status": "initiated",
#     ...
#   }
# }
```

### 4. 觀察 SSE 實時更新

在 SSE 終端中，你會看到：

```
event: TransferInitiated
data: {...}

event: TransferDebitApplied
data: {...}

event: TransferCreditApplied
data: {...}

event: TransferCompleted
data: {...}
```

### 5. 驗證最終狀態

```bash
# 查詢 Alice 的帳戶
curl http://localhost:3000/api/accounts/account-alice/balance
# { "balanceCents": 70000 }

# 查詢 Bob 的帳戶
curl http://localhost:3000/api/accounts/account-bob/balance
# { "balanceCents": 80000 }

# 查詢轉帳狀態
curl http://localhost:3000/api/transfers/transfer-123
# { "status": "completed" }

# 查詢交易歷史
curl http://localhost:3000/api/accounts/account-alice/transactions
# [
#   { "type": "transfer_debit", "amountCents": 30000, ... }
# ]
```

---

## ⚠️ 錯誤處理

### 通用錯誤格式

所有錯誤響應都遵循以下格式：

```json
{
  "success": false,
  "error": "描述性錯誤訊息"
}
```

### HTTP 狀態碼

| 狀態碼 | 說明 | 示例 |
|--------|------|------|
| 200 | 成功（查詢） | GET /accounts |
| 201 | 已創建 | POST /accounts |
| 202 | 已接受（異步） | POST /transfers |
| 400 | 請求無效 | 驗證失敗 |
| 404 | 資源不存在 | 帳戶不存在 |
| 500 | 服務器錯誤 | 未預期的異常 |

### 常見錯誤

```json
// 帳戶不存在
{
  "success": false,
  "error": "Account not found"
}

// 帳戶已凍結
{
  "success": false,
  "error": "Account is frozen, operation not allowed"
}

// 餘額不足
{
  "success": false,
  "error": "Insufficient funds: Current balance 10000, needed 50000"
}

// 驗證失敗
{
  "success": false,
  "error": "Validation error: amountCents must be greater than 0"
}
```

---

## 🧪 使用 cURL 測試

```bash
# 健康檢查
curl http://localhost:3000/api/health

# 獲取所有帳戶
curl http://localhost:3000/api/accounts

# 創建帳戶
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"user-1","ownerName":"Test User","currency":"TWD","initialDepositCents":100000}'

# 存款
curl -X POST http://localhost:3000/api/accounts/{id}/deposit \
  -H "Content-Type: application/json" \
  -d '{"amountCents":50000}'

# 發起轉帳
curl -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"fromAccountId":"{id1}","toAccountId":"{id2}","amountCents":20000}'

# 查詢死信隊列
curl http://localhost:3000/api/dlq
```

---

## 📝 API 版本

當前 API 版本：**v1**（URL 中未顯示，假設為最新版本）

---

完整的 API 文檔至此結束。有任何問題，請參考 [EVENT_DRIVEN_GUIDE.md](./EVENT_DRIVEN_GUIDE.md) 或 [BEST_PRACTICES.md](./BEST_PRACTICES.md)。
