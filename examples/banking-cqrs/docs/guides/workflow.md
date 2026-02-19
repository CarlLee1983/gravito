# DDD 開發實戰流程 (Development Workflow)

本指南將帶您從需求分析開始，一步步實踐 DDD 的開發流程。

---

## 1. 戰略階層：探索與劃界 (Discovery & Bounded Context)

這個階段的目標是**聽懂業務**，不要急著寫代碼。

### 1.1 收集 User Stories (使用者故事)
用最自然的語言描述需求場景。
> e.g. "行銷人員希望能夠針對 VIP 會員設定全站 8 折優惠，且排除特定促銷商品。"

### 1.2 Event Storming (事件風暴)
邀請 Domain Experts 一起畫圖。
1.  **橘色便利貼 (Events)**：列出所有發生的事 (`PromotionCreated`, `DiscountApplied`)。
2.  **藍色便利貼 (Commands)**：找出觸發點 (`CreatePromotion`, `ApplyDiscount`)。
3.  **紫色便利貼 (Policies)**：找出規則 (`IsVipMember`, `ExcludePromotionItems`)。
4.  **黃色便利貼 (Aggregates)**：圈出責任邊界 (`Promotion`, `Member`, `Product`)。

### 1.3 定義 Bounded Context (界限上下文)
根據 Event Storming 的結果，劃分系統邊界。
*   **行銷上下文 (Marketing Context)**：由 `Promotion` 聚合負責。
*   **會員上下文 (Member Context)**：由 `Member` 聚合負責。
*   **商品上下文 (Product Context)**：由 `Product` 聚合負責。

**產出**：Context Mapping 圖，定義上下文之間的關係 (如 Shared Kernel: `MemberLevel`)。

---

## 2. 戰術階層：領域建模 (Domain Modeling)

這個階段的目標是**設計物件模型**，仍然不寫資料庫。

### 2.1 識別 Aggregate Root (聚合根)
問自己兩個問題：
1.  **一致性邊界**：刪除這個物件，底下的東西還能存在嗎？(刪除 `Promotion`，`PromotionRule` 也要消失 -> `Promotion` 是 Root)。
2.  **全域存取**：外部系統需要直接用 ID 查它嗎？(Yes -> Root)。

### 2.2 定義 Entities 與 Value Objects
1.  **Value Object 優先**：能用 VO 就用 VO (`DiscountRate`, `DateRange`)。不可變性讓程式碼更安全。
2.  **Entity 為輔**：只有真正需要追蹤變化的才用 Entity (`Member`, `Order`)。

### 2.3 設計 Repositories (倉儲介面)
定義 Domain 層需要的存取介面。
```typescript
interface IPromotionRepository {
  save(promotion: Promotion): Promise<void>;
  findById(id: string): Promise<Promotion | null>;
  findActivePromotions(): Promise<Promotion[]>;
}
```

---

## 3. 實作階層：CQRS 與 Application Service

這個階段開始寫 **Application Layer** 的程式碼。

### 3.1 定義 Commands (命令)
```typescript
class CreatePromotionCommand {
  constructor(
    public readonly name: string,
    public readonly discountRate: number,
    public readonly validFrom: Date,
    public readonly validTo: Date
  ) {}
}
```

### 3.2 實作 Command Handlers
```typescript
class CreatePromotionHandler {
  constructor(private repo: IPromotionRepository) {}

  async handle(command: CreatePromotionCommand) {
    // 1. 驗證 Invariant (可在 Factory)
    // 2. 建立 Aggregate
    const promotion = Promotion.create(command);
    // 3. 持久化
    await this.repo.save(promotion);
  }
}
```

### 3.3 定義 Queries (查詢)
設計 Read Model DTO，直接從 DB 查詢最適合前端的資料結構。

---

## 4. 基礎設施階層：Persistence (持久化)

最後一步，才是實作 **Infrastructure Layer**。

### 4.1 實作 Repository (Impl)
寫 SQL 或 ORM 程式碼，將 Aggregate Root 轉換為資料庫 Row。
*   `Promotion` -> `promotions` table
*   `PromotionRule` -> `promotion_rules` table (One-to-Many)

### 4.2 整合與測試
1.  **Unit Test**: 測試 Domain Logic (Aggregate & Service)，Mock Repository。
2.  **Integration Test**: 測試 Application Service + 真實 DB，確保資料能正確寫入讀取。

---

## 5. 常見誤區提醒

1.  **過度設計**：CRUD 系統硬套 DDD。如果是簡單的後台管理，ActiveRecord 就夠了。
2.  **貧血模型 (Anemic Model)**：Aggregate只剩 Getter/Setter，邏輯全在 Service。-> **請將邏輯移回 Aggregate！**
3.  **忽略語言特性**：Java 的 DDD 模式不一定適合 TypeScript/JS (如過度使用 Interface)。在本專案中，我們採用 Pragmatic DDD。
