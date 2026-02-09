# Stage 1: 快速交付期 —— 標準三層式 MVC 架構
**Standard 3-Tier MVC: The Productivity Monolith**

在專案起步的第一天，開發效率是首要考量。Gravito 提供了極致親切的 MVC 開發體驗，讓你能在不增加任何認知負擔的情況下，快速建構出穩定、嚴謹的業務邏輯。

### 1. 職責分離的目錄結構
在此階段，我們遵循標準的企業級規範（參考 Laravel），將邏輯劃分為三層：
- **Controller**: 請求調度與回應格式化。
- **Service**: 跨模型的業務邏輯編排與事務管理。
- **Repository**: 數據存取抽象，隔離 `atlas` 查詢細節。

---

### 2. 代碼實戰：下單流程的標準實作

#### A. API 路由與驗證 (Interface Layer)
利用 `FormRequest` 確保進入系統的資料是乾淨且安全的。

```typescript
// src/Http/Requests/StoreOrderRequest.ts
export class StoreOrderRequest extends FormRequest {
  schema() {
    return Schema.Object({
      product_id: Schema.Number().min(1),
      quantity: Schema.Number().min(1).max(10),
    });
  }
}

// src/Http/Controllers/OrderController.ts
export class OrderController extends Controller {
  constructor(private orderService: OrderService) {}

  async store(ctx: Context) {
    const data = await ctx.validate(StoreOrderRequest);
    const order = await this.orderService.processCheckout(ctx.auth.user.id, data);
    return ctx.json({ message: 'Order created', data: order }, 201);
  }
}
```

#### B. 業務邏輯層 (Service Layer)
所有的規則（如庫存檢查、金額計算）都封裝在此，保證邏輯的可重用性。

```typescript
// src/Services/OrderService.ts
export class OrderService {
  constructor(
    private productRepo: ProductRepository,
    private orderRepo: OrderRepository
  ) {}

  async processCheckout(userId: number, data: any) {
    // 核心邏輯採線性編排，直觀易懂
    const product = await this.productRepo.findById(data.product_id);
    
    if (product.stock < data.quantity) {
      throw new BusinessException('庫存不足');
    }

    return await DB.transaction(async (trx) => {
      const order = await this.orderRepo.create({ userId, ...data }, trx);
      await this.productRepo.decrementStock(data.product_id, data.quantity, trx);
      return order;
    });
  }
}
```

---

### 3. 此階段的優勢 (The Pros)
1.  **開發手感極佳**：Laravel / Spring 開發者可以在 5 分鐘內上手。
2.  **型別安全**：透過 TypeScript 與 Gravito Core 的整合，從路由到資料庫都有完整補完。
3.  **極速交付**：適合初期產品驗證，運維成本幾乎為零。

---

### 4. 潛在的陷阱與「擴充牆」 (The Scaling Wall)

雖然三層架構在初期表現優異，但隨著業務深度增加，它會遇到物理與邏輯的雙重極限：

#### ⚠️ 複雜決策邏輯的「僵化」
即便開發者能透過拆分 `PaymentService` 或 `NotificationService` 來避免類別肥大，但三層架構本質上是為「線性商務流程」設計的。當遇到以下場景時，它會變得難以擴充：
- **動態策略難以施展**：例如「多重折扣疊加組合」、「階梯式導購決策」。在傳統 Service 中，這些非線性邏輯會導致程式碼充斥著難以解耦的 `if-else`。
- **設計模式的阻力**：要在此架構下優雅地運用策略模式 (Strategy) 或責任鏈模式 (Chain) 來處理複雜規則，往往會因為層級間的硬耦合而顯得笨重，降低了系統應對市場變化的「決策敏捷度」。

#### 🚀 物理效能的瓶頸
- **資料庫鎖死 (DB Deadlock)**：在秒殺等極端併發場景，多個實例爭奪同一行庫存的「事務鎖」，會導致資料庫效能瞬間崩潰。
- **缺乏削峰能力**：同步處理機制無法應對突發流量，容易引發系統雪崩。

**這就是為什麼我們需要進入 [Stage 2: 維護性重構](./stage-2-modular.md)，透過領域驅動設計 (DDD) 建立一個具備「決策擴展力」與「抗壓性」的現代架構。**
