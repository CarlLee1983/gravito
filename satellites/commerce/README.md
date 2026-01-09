# @gravito/satellite-commerce 🛰️

這是 Gravito Galaxy 的核心交易與訂單引擎。它專為高性能電商場景設計，具備金融級的原子性保證與「渦輪增壓」擴展能力。

## 🌟 核心特性

- **原子化下單**: 訂單、明細、庫存預扣在單一資料庫事務中完成。
- **樂觀鎖 (Optimistic Locking)**: 內建 `version` 校驗，無需 Redis 即可應對中併發搶購，徹底杜絕超賣。
- **價格快照 (Snapshotting)**: 訂單明細紀錄結帳當下的單價，防止商品調價引起的財務糾紛。
- **調整項系統 (Adjustments)**: 靈活處理運費、折扣、稅金，支援行銷插件動態注入。
- **Galaxy Hook 聯動**: 預留多個掛載點，輕鬆串接紅利、點數、郵件與物流系統。

## 🚀 快速上手

### 1. 安裝
```bash
# 在您的 Gravito 專案中
bun add @gravito/satellite-commerce
```

### 2. 註冊插件
```typescript
import { CommerceServiceProvider } from '@gravito/satellite-commerce'

await core.use(new CommerceServiceProvider())
```

### 3. API 接口
- **POST `/api/commerce/checkout`**: 下單結帳
  - Header `X-Idempotency-Key`: 確保請求冪等。
  - Body: `{ items: [{ variantId: 'uuid', quantity: 1 }] }`

## 🔗 Hook 清單 (Galaxy 擴充)

| Hook 名稱 | 類型 | 描述 | Payload / Return |
| :--- | :--- | :--- | :--- |
| `commerce:order:adjustments` | Filter | 行銷插件注入折扣或加價 | `(adjustments[], { order })` |
| `commerce:order-placed` | Action | 訂單建立後觸發 (紅利/發信) | `{ orderId: string }` |
| `rewards:assigned` | Action | 紅利分配完成後的後續動作 | `{ memberId, points }` |

## 🏎️ 渦輪增壓模式 (Turbo Mode)
本模組支援「秒開渦輪」。當環境變數 `COMMERCE_MODE=turbo` 時，可切換為 Redis 預扣與非同步隊列模式（需安裝 turbo-engine 擴展包）。
