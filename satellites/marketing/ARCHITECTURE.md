# Marketing Satellite 架構說明 🎯

## 1. 規則策略模式 (Strategy Pattern)
我們將每一種行銷玩法抽象為 `IPromotionRule`。
當 `PromotionEngine` 運行時，它會根據資料庫中活動的 `type` 動態加載對應的策略類別執行 `match(order, config)`。這確保了系統可以在不改動引擎代碼的情況下，透過增加檔案來支援無限的新玩法。

## 2. 三段推進實作 (Marketing Stages)

### Stage 1: Standard
- 直接查詢 SQL 中的 `promotions` 與 `coupons` 表。
- 適用於日常運作。

### Stage 2: Sport (內存加速)
- 將「進行中」的系統促銷規則（如滿額折抵）加載至內存快取。
- 下單時無需查詢 DB 即可完成規則匹配。

### Stage 3: Turbo (分佈式鎖)
- 針對限量的折價券，核銷張數由 Redis `DECR` 原子操作控制。
- 確保在 K8s 叢集環境下，折價券不會被「超領」。

## 3. 數據快照與法律一致性
Marketing 產生的 `Adjustment` 會被 Commerce 永久保存至 `order_adjustments`。這意味著即便活動結束或規則被刪除，歷史訂單的折扣紀錄依然完整且具備法律效力。