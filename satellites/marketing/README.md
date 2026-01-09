# @gravito/satellite-marketing 🎯

這是 Gravito Galaxy 的行銷與促銷規則引擎。它設計用於在不侵入核心交易邏輯的前提下，動態注入折扣、折價券與贈品。

## 🌟 核心特性

- **策略驅動引擎**: 基於規則策略模式，輕鬆擴充新的促銷玩法（如買幾送幾）。
- **折價券生命週期**: 支援 Code 核銷、張數限制、有效期與最低消費限制。
- **非侵入式聯動**: 透過 Hook 注入 `Adjustment`，完全解耦 Commerce 與 Marketing。
- **高併發預留**: 支持 Sport 模式內存快取規則，與 Turbo 模式 Redis 原子核銷。

## 🚀 促銷玩法 (Built-in Rules)

| 類型 | 標籤 | 描述 |
| :--- | :--- | :--- |
| `cart_threshold` | 滿額折抵 | 當購物車小計超過門檻，扣除固定金額。 |
| `buy_x_get_y` | 買 X 送 Y | 針對特定 SKU，每買 X 個就折抵 Y 個的金額。 |
| `coupon` | 折價券 | 使用者輸入代碼，套用固定或百分比折扣。 |

## 🔗 Galaxy 聯動

本插件主要監聽 Commerce 的價格計算過濾器：
- **Filter**: `commerce:order:adjustments`
- **Action**: `commerce:order-placed` (用於核銷折價券次數)
