# DDD 戰術設計 (Tactical Patterns)

戰術設計是開發者日常最常接觸的部分，它提供了一套具體的程式碼模式來實現領域模型。

---

## 1. 領域物件三劍客

### 1.1 Entity (實體)
**特徵**：擁有**唯一標識 (Identity)**，且生命週期中狀態會改變。
**判斷**：如果兩個物件屬性完全相同但 ID 不同，它們是不同的東西嗎？Yes -> Entity。
**例子**：`User`, `Order`, `Product`。

### 1.2 Value Object (值對象)
**特徵**：由**屬性值**定義，**不可變 (Immutable)**，無 ID。
**判斷**：如果把這個物件替換成另一個屬性相同的物件，有差嗎？No -> Value Object。
**例子**：`Money`, `Address`, `Color`, `DateRange`。
**優點**：
*   **型別安全**：用 `Email` 類別代替 `string`。
*   **邏輯內聚**：`money.add(other)` 邏輯封裝在 VO 內，而不是散落在 Service。

### 1.3 Aggregate (聚合) 與 Aggregate Root (聚合根)
**定義**：
*   **Aggregate**: 一組相關聯的 Entity 和 Value Object 的集合，被視為資料修改的一個單元。
*   **Root**: 這個集合中唯一允許外部存取的 Entry Point。

**規則**：
1.  **Root 擁有全域 ID**，內部 Entity 只有局部 ID。
2.  **外部只能引用 Root**，不能直接引用內部成員。
3.  **交易邊界**：一次 Transaction 只能修改一個 Aggregate。
4.  **刪除 Root = 刪除全部**：刪除 Order，OrderItems 也隨之消失。

---

## 2. 領域服務 (Domain Service)

**定義**：當有一個業務邏輯**無法自然地歸類到任何一個 Entity 或 Value Object** 時，我們就把它做成 Domain Service。
**特徵**：無狀態 (Stateless)。

**常見場景**：
1.  **跨聚合的操作**：如「轉帳」涉及兩個 `Account` 聚合。`Account.transfer(toAccount)` 會導致一個聚合修改另一個聚合，違反原則。應由 `TransferService.transfer(from, to)` 協調。
2.  **與外部系統互動的介面**：如 `ExchangeRateService` (匯率服務)。雖然實作接 API，但介面定義在 Domain。

---

## 3. 領域事件 (Domain Events)

**定義**：描述領域中已經發生的一件事。
**命名**：**名詞 + 動詞過去式** (e.g., `OrderPlaced`, `AccountDebited`)。
**用途**：
1.  **解耦副作用**：主流程只發事件，副作用 (Email, Log) 由 Listener 處理。
2.  **最終一致性**：更新 Read Model 或通知其他 Context。

---

## 4. 倉儲 (Repository)

**定義**：模擬一個「物件集合 (Collection)」。讓你在寫領域邏輯時，感覺像是在操作記憶體中的 List，而不是資料庫。
**原則**：
1.  **只有 Aggregate Root 才有 Repository**。如果是 `OrderItem`，不應該有 `OrderItemRepository`，你必須透過 `Order` 來存取它。
2.  **介面定義在 Domain，實作在 Infrastructure** (DIP)。

---

## 5. 工廠 (Factory)

**定義**：負責封裝複雜的物件建立邏輯。
**形式**：
1.  **Factory Method**：`Account.create(...)`
2.  **Factory Class**：`OrderFactory.createFromCart(cart)`

---

## 6. 模組 (Modules)

**定義**：在程式碼層面將相關的領域概念組織在一起。
**JS/TS 實踐**：利用資料夾結構與 `index.ts` (Barrel File) 來封裝模組，只導出 Aggregate Root 和 Service，隱藏內部細節。
