# @gravito/satellite-cart 🛒

這是 Gravito Galaxy 的高效購物車持久化模組。它支援多設備同步、訪客合併以及針對高併發場景的「三段式推進」存儲策略。

## 🌟 核心特性

- **跨設備持久化**: 支援會員與訪客身分識別，購物車不再隨瀏覽器關閉而消失。
- **自動合併邏輯**: 偵測到會員登入後，自動將訪客期間加購的品項合併至會員帳戶。
- **三段式存儲**:
  - **Standard**: SQL 存儲（預設）。
  - **Sport**: Session / 內存快取。
  - **Turbo**: Redis 叢集存儲（百萬併發適用）。
- **無縫 Hook 聯動**: 監聽身分衛星事件，實現零代碼侵入的購物車轉移。

## 🚀 快速上手

### 1. API 使用
- **GET `/api/cart`**: 獲取購物車。
  - 訪客請帶 Header: `X-Guest-ID: <UUID>`。
- **POST `/api/cart/items`**: 加購。
  - Body: `{ variantId: "uuid", quantity: 1 }`

## 🔗 Galaxy 聯動

本插件監聽以下事件：
- **Action**: `member:logged-in` -> 觸發 `MergeCart` UseCase。
