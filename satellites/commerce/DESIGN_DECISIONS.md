# Commerce Satellite 設計決策

## 1. Flash-Sale 依賴集成

### 決策背景

Commerce 套件依賴 Flash-Sale 套件，實現透過直接服務層整合而非純事件驅動的架構模式。

### 設計理由

- **性能**: 直接依賴比事件總線快（零延遲），重要在高併發搶購場景
- **一致性**: 同步調用確保訂單與閃購狀態在同一事務中協調，杜絕競態條件
- **簡化**: 減少事件複雜度，避免事件序列化/反序列化開銷

### 隔離機制

Flash-Sale API 通過容器注入（DI）而非直接導入，實現鬆耦合：

```typescript
// 正確模式（容器注入）
export class OrderService {
  constructor(private flashSaleService: IFlashSaleService) {}
}

// 不推薦（直接導入）
import { flashSaleService } from '@gravito/satellite-flash-sale'
```

此隔離機制允許在不修改 Commerce 代碼的情況下，替換或模擬 Flash-Sale 實現。

### 後續改進計畫

- **v1.0.0 發布**: 當前設計，通過 DI 隔離，生產就緒
- **v2.0.0 評估**: 計劃評估完全事件驅動遷移，降低 Commerce ↔ Flash-Sale 耦合度
  - 需要事件總線低延遲能力驗證
  - 需要分布式事務協調（Saga）模式評估
  - 預計 Q2 2026 啟動

### 相關實現

- **服務容器**: `packages/commerce/src/services/`
- **Flash-Sale 集成**: `packages/commerce/src/services/checkout/`
- **Flash-Sale 模組**: `satellites/flash-sale/src/`

---

## 2. 調整項（Adjustments）系統設計

### 概述

調整項系統提供靈活的費用增減機制（折扣、運費、稅金、服務費），支援行銷插件動態注入。

### 架構決策

**不使用 Satellite 模式的原因**：

Adjustments 是訂單的核心組件，不是可選的領域擴展。為保證原子性，必須在同一事務中計算調整項與訂單總額。事件驅動會引入異步延遲，違背金融級原子性要求。

**支援動態擴展的方式**：

通過 Galaxy Hook `commerce:order:adjustments` 允許其他 Satellites（如營銷、會員）在結帳前注入自定義調整項：

```typescript
// 其他 Satellite 可透過 Hook 注入折扣
core.hook('commerce:order:adjustments', async (adjustments, { order }) => {
  const discount = await calculateMemberDiscount(order)
  adjustments.push(discount)
  return adjustments
})
```

### 相關實現

- **調整項類型**: `packages/commerce/src/types/Adjustments.ts`
- **Hook 定義**: `packages/commerce/src/hooks/`

---

## 3. 庫存預扣與樂觀鎖

### 概述

Commerce 使用樂觀鎖（Optimistic Locking）實現無鎖併發控制，支援高併發搶購。

### 設計決策

**選擇樂觀鎖而非悲觀鎖的原因**：

- 吞吐量: 無鎖更新，高併發環境吞吐量高 10 倍
- 可擴展性: 無行級鎖，支援水平擴展
- 避免死鎖: 無鎖持有，消除死鎖可能

**樂觀鎖實現**：

使用 `version` 欄位，每次更新時檢查版本一致性：

```typescript
UPDATE inventory
SET quantity = quantity - ?, version = version + 1
WHERE id = ? AND version = ?
```

### 容錯機制

- 預扣失敗自動重試（3 次）
- 最終使用者收到「商品已售罄」
- 預扣記錄用於退貨流程追蹤

### 相關實現

- **庫存服務**: `packages/commerce/src/services/inventory/`
- **事務管理**: `packages/atlas/src/repositories/` (ORM 層)

---

## 4. 訂單快照機制

### 概述

訂單明細記錄結帳當下的商品單價與屬性快照，防止調價或屬性變更引起的財務糾紛。

### 設計決策

**快照時機**: 在 Checkout 服務層創建訂單時立即捕捉

```typescript
async checkout(items: CartItem[]): Promise<Order> {
  // 快照當下商品價格與屬性
  const snapshots = items.map(item => ({
    variantId: item.variantId,
    price: item.product.price,  // 快照
    name: item.product.name,     // 快照
    // ...
  }))

  // 創建訂單時存儲快照
  return this.orderRepository.create({ snapshots })
}
```

### 優點

- **財務追蹤**: 訂單記錄獨立於商品主檔
- **糾紛解決**: 明確記錄用戶當時看見的價格
- **審計**: 完整的價格變更歷史

### 相關實現

- **訂單模型**: `packages/commerce/src/models/Order.ts`
- **快照服務**: `packages/commerce/src/services/checkout/SnapshotService.ts`

---

## 5. Galaxy Hook 整合策略

### 概述

Commerce 預留多個 Hook 掛載點，便利其他 Satellites 動態擴展功能。

### 定義的 Hook

| Hook 名稱 | 類型 | 觸發時機 | Payload | 用途 |
|----------|------|--------|---------|------|
| `commerce:order:adjustments` | Filter | 計算調整項前 | `(adjustments[], { order })` | 行銷、會員系統注入折扣 |
| `commerce:order-placed` | Action | 訂單建立後 | `{ orderId: string }` | 紅利分配、發信、物流 |
| `commerce:order-cancelled` | Action | 訂單取消後 | `{ orderId: string }` | 庫存還原、點數退回 |

### 使用示例

```typescript
// 會員 Satellite 監聽訂單建立，分配紅利
core.hook('commerce:order-placed', async ({ orderId }) => {
  const order = await orderService.findById(orderId)
  await rewardsService.assignPoints({
    memberId: order.memberId,
    points: order.total * 0.01  // 1% 紅利
  })
})
```

### 相關實現

- **Hook 定義**: `packages/commerce/src/hooks/CommerceHooks.ts`
- **Hook 管理**: `packages/core/src/HookManager.ts`

---

## 更新日期

2026-02-26

## 決策狀態

✅ 已驗證 (v1.0.0 發布)

## 相關文檔

- [Commerce README](./README.md)
- [Gravito Galaxy Architecture](../../WHITEPAPER_ZH_TW.md)
- [Satellite 隔離原則](../../docs/claude/constraints.md)
