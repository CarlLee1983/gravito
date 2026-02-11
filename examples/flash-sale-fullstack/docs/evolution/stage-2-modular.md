# Stage 2: 維護性重構期 —— Clean Architecture 與領域驅動 (DDD) 轉型
**Clean Architecture & DDD: The Evolutionary Core**

當業務邏輯從「簡單的增刪查改」演變為「複雜的決策鏈」時，Stage 1 的 MVC 架構會開始顯得力不從心。Gravito 引導你將架構重心從「技術分層」移向「業務領域」，透過 **Clean Architecture** 與 **DDD** 的原則，解決邏輯臃腫與硬耦合問題。

---

### 1. 從 Controller 到 ADR：解耦請求生命週期
在傳統 MVC 中，Controller 往往承擔了過多職責。在 Stage 2，我們改用 **ADR (Action-Domain-Responder)** 模式：

-   **Action**: 單一職責類別，僅負責「啟動」一個業務用例（Use Case）。例如 `CreateOrderAction` 只處理建立訂單的請求。
-   **Domain**: 核心業務邏輯的所在地，不依賴於 HTTP 或任何傳輸協議。
-   **Responder**: 獨立的回應建構者，負責根據領域層的輸出，格式化為正確的 JSON、多語系訊息或錯誤代碼。

```typescript
// src/Http/Actions/Orders/CreateOrderAction.ts
export class CreateOrderAction {
  constructor(
    private interactor: CreateOrderUseCase, // 領域層的業務用例
    private responder: OrderResponder      // 專用的回應處理器
  ) {}

  async handle(ctx: Context) {
    const input = await ctx.validate(CreateOrderRequest);
    const result = await this.interactor.execute(ctx.auth.user.id, input);
    
    return this.responder.render(ctx, result);
  }
}
```

---

### 2. 領域核心 (Domain Core)：解決複雜邏輯的良藥
當業務規則不再是單純的庫存減一，而是包含「VIP 優先權」、「組合商品庫存鎖定」、「限時活動疊加」時，Stage 1 的線性 Service 就會崩潰。Stage 2 透過以下 DDD 模式來「拆解」複雜性：

#### A. 領域實體與聚合 (Entity & Aggregate)
我們不再只是操作資料庫欄位，而是操作具備行為的**對象**。
- **不變性 (Invariants)**：在 `Order` 聚合根中，我們封裝「訂單一旦進入支付狀態，商品品項即不可修改」這類規則，由對象內部自我保護。
- **狀態機模式**：利用聚合內部的狀態遷移邏輯，防止非法狀態跳轉（例如：未支付訂單直接變更為已出貨）。

#### B. 策略模式 (Strategy Pattern) 與政策 (Policy)
針對秒殺活動中變幻莫測的「限購規則」，我們將其抽象化：

```typescript
// src/Domain/FlashSale/Policies/IPurchasePolicy.ts
export interface IPurchasePolicy {
  isSatisfiedBy(user: User, product: Product): Promise<boolean>;
}

// 具體實作：VIP 限購政策
export class VipOnlyPolicy implements IPurchasePolicy {
  async isSatisfiedBy(user: User) { return user.isVip; }
}
```

#### C. 領域服務 (Domain Service)
當邏輯橫跨多個聚合（例如：跨倉庫的庫存調度計算）時，定義純粹的 Domain Service，確保業務知識不會洩露到應用層（Application） or 基礎設施層。

---

### 3. 依賴倒置 (DIP) 與 Repository 抽象
為了確保核心邏輯不被資料庫技術綁架，我們在領域層定義 **Repository 介面**，而在基礎設施層（Infrastructure）實作它。

```typescript
// 領域層：定義介面 (src/Domain/Orders/Repositories/IOrderRepository.ts)
export interface IOrderRepository {
  save(order: OrderEntity): Promise<void>;
  nextId(): string;
}

// 基礎設施層：利用 atlas 實作 (src/Infrastructure/Persistence/AtlasOrderRepository.ts)
export class AtlasOrderRepository implements IOrderRepository {
  async save(order: OrderEntity) {
    // 💡 Model 僅作為資料持久化對象 (PO)
    await OrderModel.updateOrCreate({ id: order.id }, order.toRaw());
  }
}
```

---

### 4. 衛星邊界 (Satellite Boundaries)：模組化單體
雖然系統仍然運行在單一進程中，但我們透過 **ServiceProvider** 強制劃分「領域衛星」。

-   **領域隔離**：`Order` 衛星禁止直接 `import` `Inventory` 的任何代碼。
-   **內部通訊**：跨衛星通訊必須透過 `this.core.invoke('inventory:decrement', { id, qty })`。
-   **依賴注入**：所有的類別都由 Gravito Container 管理，實現完全的解耦。

```typescript
// src/Satellites/Ordering/OrderingServiceProvider.ts
export class OrderingServiceProvider extends ServiceProvider {
  register() {
    // 💡 綁定抽象到具體實作
    this.container.bind('order.repo', AtlasOrderRepository);
    this.container.singleton(CreateOrderUseCase);
  }

  boot() {
    // 💡 單一路由對應單一 Action
    this.router.post('/orders', [CreateOrderAction, 'handle']);
  }
}
```

---

### 5. 領域事件 (Domain Events)：副作用的解耦
下單後需要傳送簡訊、更新積分、通知倉庫？在 Stage 2 中，我們不再將這些邏輯塞進 `OrderService`。
業務用例會觸發一個 **Domain Event**，由不同的訂閱者（Subscribers）非同步處理，這為 Stage 3 的分佈式架構埋下了伏筆。

---

### 6. 此階段的成果
1.  **極致的維護性**：改動「折扣算法」不會影響到「訂單建立」流程。
2.  **不依賴技術細節**：你可以輕鬆地將資料庫從 MySQL 換成 PostgreSQL，甚至換掉 Web 框架，而核心業務邏輯（Domain）毫髮無傷。
3.  **物理拆分的「零成本」轉型**：因為代碼已經在邏輯上完全解耦，當流量爆發需要進入 [Stage 3: 極限擴張](./stage-3-galactic.md) 時，你只需要更改組態，就能將衛星部署到不同的伺服器上。

**Stage 2 是從「寫程式」到「設計系統」的關鍵轉折點。**
