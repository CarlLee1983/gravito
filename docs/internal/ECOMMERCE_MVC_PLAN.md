# E-Commerce MVC + SPA 範例架構規劃（Draft）

此文件為**規劃稿**，不包含實作。目標是建立「可由 CLI 生成 MVC 結構」的電商範例架構，並符合以下需求：

- SPA 使用 Vue
- Email 模板使用 Vue
- Queue 使用自家套件（Redis 驅動）
- 使用 Luminosity 產生 sitemap
- 支援訪客購物車與登入後合併
- 提供歷史訂單頁用於驗證 DB 內容

---

## 1) 架構總覽

### 主要模組（建議）
- `@gravito/orbit-db`：資料層（商品/訂單/會員/購物車）
- `@gravito/sentinel`：登入驗證
- `@gravito/stasis`：購物車快取（可搭配 Redis）
- `@gravito/flare`：寄信服務（由 Queue 驅動）
- `@gravito/luminosity`：SEO / sitemap
- `@gravito/ion`：SPA 整合（Vue）
- Queue 套件（自家）：Redis 驅動

### 範例頁面
- 首頁：商品列表（10 個）
- 商品詳情：規格選擇 + 加入購物車
- 購物車：數量調整 / 移除
- 結帳：填寫收件資訊 + 付款方式
- 歷史訂單：驗證 DB 訂單記錄
- 關於我們 / 隱私權
- 登入頁（登入成功回原頁）

### 圖片
全部使用線上圖庫 URL，不產生本地圖片檔案。

---

## 2) 路由規劃（MVC + SPA）

### 公開頁面
- `GET /`：首頁（商品列表）
- `GET /about`
- `GET /privacy`
- `GET /products/:slug`：商品詳情

### 會員流程
- `GET /login`
- `POST /login`（成功後導向 redirect）

### 購物車與結帳
- `POST /cart/add`（未登入 → redirect 到 `/login?redirect=...`）
- `GET /cart`
- `POST /cart/update`
- `POST /cart/remove`
- `GET /checkout`
- `POST /checkout`

### 歷史訂單
- `GET /orders`（需登入）

### SEO
- `GET /sitemap.xml`（由 Luminosity 產出）
- `GET /robots.txt`

---

## 3) 資料模型（概念）

### User
- id
- email
- passwordHash
- name

### Product
- id
- title
- slug
- description
- price
- imageUrl

### ProductVariant
- id
- productId
- name（例如：顏色/尺寸/容量）
- options（例如：red/blue 或 350ml/450ml）

### Cart
- id
- userId?（登入後綁定）
- sessionId?（訪客）
- items[]

### CartItem
- cartId
- productId
- variantId
- qty
- unitPrice

### Order
- id
- userId
- total
- status
- shippingName
- shippingAddress
- paymentMethod

### OrderItem
- orderId
- productId
- variantId
- qty
- unitPrice

---

## 4) 訪客購物車 → 登入合併流程

1. 訪客加入購物車 → 以 `sessionId` 存在快取或 DB  
2. 登入成功後：
   - 讀取訪客購物車
   - 合併至使用者購物車
   - 清除訪客購物車資料
3. 導回 `redirect` 原始頁面

---

## 5) 結帳與寄信流程（Queue 非同步）

1. 使用者送出結帳表單  
2. 建立訂單（DB）
3. 投遞 Queue 任務（自家套件 + Redis）
4. Worker 取出任務 → 產生 Vue Email 模板 → 寄送

### Email 內容（Vue 模板）
- 訂單編號
- 商品清單（名稱 / 規格 / 數量 / 小計）
- 收件資訊
- 付款方式
- 總金額

---

## 6) Sitemap（Luminosity）

### resolvers
- 靜態頁：`/`, `/about`, `/privacy`, `/login`, `/cart`, `/checkout`, `/orders`
- 動態頁：所有商品 `/products/:slug`

---

## 7) 測試帳號（Seed）

- email: `test@gravito.dev`
- password: `Password123!`

用途：驗證登入、購物車、結帳、歷史訂單流程。

---

## 8) CLI 生成 MVC 架構（後續實作方向）

### 預期輸出
- Controllers / Models / Views / Routes 基礎結構
- 預載商品資料 + 種子帳號
- SPA 前端骨架（Vue）
- Queue worker scaffold

---

## 9) 待確認事項

- Queue 自家套件 API 介面與使用方式
- Vue Email 模板使用方式（render pipeline）
- SPA 路由對應 MVC 控制器邊界
- 購物車資料要存 DB 或 Cache（或混合）

---

## 10) 自家 Queue API 介面假想（Draft）

> 以下為規劃中的 API 方向，用於對齊使用方式與責任邊界，實作時可調整。

### Queue Producer（App 端）
- `queue.publish(topic, payload, options?)`
- `queue.delay(ms)`（optional）
- `queue.retry(count)`（optional）

### Queue Consumer（Worker 端）
- `queue.subscribe(topic, handler)`
- `queue.ack(job)` / `queue.nack(job)`
- `queue.concurrency(n)`

### 範例流程（概念）
1. 訂單建立後 `publish('mail.order.created', payload)`
2. Worker 透過 `subscribe` 消費並寄信
3. 成功 `ack`，失敗 `retry` 或 `nack`

---

## 11) Vue Email Render 流程草案（Draft）

### 目標
- 以 Vue 組件作為 Email Template
- 在 Worker 端產出 HTML 字串並寄送

### 流程概念
1. 建立 `OrderEmail.vue` 組件（接收 `order` 資料）
2. Worker 取得訂單資料後，將組件 render 成 HTML
3. 交給 `@gravito/flare` 寄送

### 示意（非實作）
- `renderEmail(Component, props) -> html`
- `mailer.send({ to, subject, html })`

---

## 12) 訪客購物車合併策略（建議）

### 方案 A：全走 DB（簡單一致）
- 訪客以 `sessionId` 建立 Cart 記錄（DB）
- 登入後把 `sessionId` 的 Cart 合併到 `userId` Cart
- 優點：一致性高、可追蹤、易除錯
- 缺點：訪客流量大時 DB 負擔增加

### 方案 B：訪客走 Cache，登入才進 DB（效能優先）
- 訪客以 `sessionId` 存在 Cache（Redis）
- 登入後讀取 Cache → 合併到 DB → 清除 Cache
- 優點：訪客流量大時效能佳
- 缺點：需要 Cache 失效/續期策略

### 方案 C：混合（建議）
- 訪客優先 Cache，達到條件才落 DB
- 例如：加入商品數量達門檻或即將結帳時落 DB

### 合併規則（建議）
- 同商品 + 同規格 → 累加數量
- 不同規格 → 新增項目
- 合併後以「登入購物車」為主，訪客購物車清除
