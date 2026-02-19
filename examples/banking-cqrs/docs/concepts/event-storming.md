# Event Storming（事件風暴）實戰指南

## 1. 什麼是 Event Storming？

Event Storming 是一種**協作式的工作坊**，旨在透過視覺化的方式，快速探索複雜的業務領域。它不談 Class Diagram、不談 DB Schema，只談**「在這個系統中，發生了什麼事（Events）？」**

*   **核心精神**：邀請領域專家（Domain Experts）和開發者（Developers）聚在一起，用便利貼把業務流程貼出來。
*   **目標**：打破知識孤島，建立統一語言（Ubiquitous Language），並理清系統邊界。

---

## 2. 準備工作：顏色代碼（Color Code）

標準的 Event Storming 使用不同顏色的便利貼代表不同概念，這對於後續轉化為 DDD 程式碼至關重要：

1.  🟧 **橘色 (Domain Event)**：領域事件（已發生的事實，過去式）。
    *   例如：`OrderPlaced`（訂單已建立）、`PaymentSucceeded`（付款成功）。
2.  🟦 **藍色 (Command)**：命令（使用者的意圖/動作）。
    *   例如：`PlaceOrder`（下訂單）、`Pay`（付款）。
3.  🟨 **黃色 (Aggregate)**：聚合（執行命令、產生事件的主體）。
    *   例如：`Order`（訂單）、`Payment`（支付單）。
4.  🟣 **紫色 (Policy / Business Rule)**：業務規則（邏輯判斷、限制條件）。
    *   例如：`CheckInventory`（檢查庫存）、`CheckVipStatus`（檢查 VIP 資格）。
5.  🟢 **綠色 (Read Model / View)**：讀取模型（使用者看到的資訊）。
    *   例如：`OrderHistory`（訂單歷史）、`ProductCatalog`（商品型錄）。
6.  👤 **黃色小人 (Actor / User)**：發起命令的人或系統。
    *   例如：`Customer`（顧客）、`Admin`（管理員）、`CronJob`（排程）。
7.  🔴 **粉紅色 (External System)**：外部系統。
    *   例如：`PayPal`、`Google Maps API`、`Email Service`。

---

## 3. 實戰五步驟 (Process)

### 第一步：大事件風暴 (Big Picture) - 🟧

*   **目標**：把發生在系統中的所有事情都列出來，不用管順序，不用管細節。
*   **動作**：大家拿著**橘色便利貼**，瘋狂寫下「發生了什麼事」。
*   **規則**：
    *   必須是**動詞過去式** (Past Tense)。
    *   例如：寫 `AccountCreated` (V)，不要寫 `CreateAccount` (X)。
*   **成果**：牆上貼滿了 `UserRegistered`, `ProductAdded`, `OrderShipped`, `SystemCrashed`...

### 第二步：時間軸排序 (Timeline) - 🟧

*   **目標**：把混亂的事件按照時間順序排好。
*   **動作**：
    *   左邊是起點（例如 `UserVisitedWebsite`），右邊是終點（例如 `OrderCompelte`）。
    *   把相關的事件串在一起。
    *   如果由並行流程，可以分上下行。
*   **發現**：這時候會發現流程斷點。「咦？`OrderPlaced` 之後怎麼直接跳到 `OrderShipped`？中間是不是少了 `PaymentConfirmed`？」-> **補上遺漏的事件！**

### 第三步：尋找觸發點 (Commands & Actors) - 🟦 👤 🔴

*   **目標**：解釋「為什麼」這個事件會發生。
*   **動作**：
    *   在每個事件 (Event) 前面，加上一個 **Command (藍色)**。
    *   在 Command 前面，加上一個 **Actor (黃色)** 或 **External System (粉紅色)**。
*   **範例**：
    *   `Customer (👤)` -> `PlaceOrder (🟦)` -> `OrderPlaced (🟧)`
    *   `PaymentGateway (🔴)` -> `ConfirmPayment (🟦)` -> `PaymentConfirmed (🟧)`

### 第四步：加入業務規則 (Policies) - 🟣

*   **目標**：找出系統的「邏輯大腦」。
*   **動作**：在 Command 和 Event 中間，插入 **Policy (紫色)**。
*   **思考**：執行這個 Command 總是成功嗎？有沒有條件？
*   **範例**：
    *   `PlaceOrder` -> **🟣 CheckStock** -> `OrderPlaced`
    *   `ApplyDiscount` -> **🟣 CheckVipStatus** -> `DiscountApplied`
*   **價值**：這些紫色便利貼直接對應到程式碼中的 `if/else` 邏輯和 `Domain Services`。

### 第五步：定義聚合 (Aggregates) - 🟨

*   **目標**：劃分資料邊界，找出 DDD 的 Aggregate Root。
*   **動作**：把相關的 Command 和 Event 圈在一起，貼上一個 **黃色大便利貼**。
*   **範例**：
    *   `PlaceOrder`, `OrderPlaced`, `CancelOrder` -> 屬於 **`Order` (🟨)**。
    *   `RegisterUser`, `UserRegistered`, `UpdateProfile` -> 屬於 **`User` (🟨)**。
*   **價值**：這直接定義了你的程式碼目錄結構 (`src/Domain/Order/`, `src/Domain/User/`)。

---

## 4. 範例：停車場系統 (Parking Lot)

讓我們把這個流程套用到停車場：

1.  **Events (🟧)**:
    *   `VehicleEntered`
    *   `TicketIssued`
    *   `FeeCalculated`
    *   `PaymentSucceeded`
    *   `VehicleExited`
    *   `SpotReleased`

2.  **Commands (🟦) & Actors (👤)**:
    *   `Driver` -> `RequestEntry` -> `VehicleEntered`
    *   `System` -> `CalculateFee` -> `FeeCalculated`
    *   `Driver` -> `PayFee` -> `PaymentSucceeded`

3.  **Policies (🟣)**:
    *   `RequestEntry` -> **🟣 CheckAvailableSpots** -> `VehicleEntered`
    *   `RequestExit` -> **🟣 CheckPaymentStatus** -> `VehicleExited`

4.  **Aggregates (🟨)**:
    *   `ParkingLot` (管理車位、入場)
    *   `ParkingSession` (管理計費、時間)

---

## 5. Event Storming 到程式碼的映射

| Event Storming 元素 | DDD 程式碼對應 | 範例 |
| :--- | :--- | :--- |
| **Command (🟦)** | Command Object / Method | `EnterParkingLotCommand` / `parkingLot.enter()` |
| **Event (🟧)** | Domain Event Class | `class VehicleEntered implements DomainEvent` |
| **Aggregate (🟨)** | Aggregate Root Class | `class ParkingLot { ... }` |
| **Policy (🟣)** | Domain Logic / Invariants / Services | `if (this.freeSpots <= 0) throw Error` |
| **Actor (👤)** | Auth / Identity / Context | `userId`, `roles` |
| **Read Model (🟢)** | Projections / DTOs / Queries | `Interface IAvailableSpotsView` |

這就是 Event Storming 的威力：它把抽象的業務對話，直接轉化為具體的架構藍圖。
