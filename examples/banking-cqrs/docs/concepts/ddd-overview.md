# DDD 與 CQRS 架構實踐指南 (Banking Example)

本文件旨在透過 `banking-cqrs` 專案，深入解析 **領域驅動設計 (DDD)** 與 **命令查詢職責分離 (CQRS)** 的架構邏輯。

我們將解釋為什麼程式碼會這樣組織，以及每個組件（Aggregate Root, Repository, Value Object）的職責與位置。

---

## 1. 專案目錄結構與 DDD 對應

在 DDD 中，我們通常採用 **分層架構 (Layered Architecture)** 或 **整潔架構 (Clean Architecture)**。本專案的目錄結構直接對應這些概念：

```
src/
├── Domain/                  # 【領域層】 (Enterprise Business Rules)
│   ├── Account/             # -> Bounded Context (界限上下文)
│   │   ├── Account.ts       # -> Aggregate Root (聚合根)
│   │   ├── IAccountRepo.ts  # -> Repository Interface (倉儲介面)
│   │   └── Events/          # -> Domain Events (領域事件)
│   ├── Shared/
│   │   └── Money.ts         # -> Value Object (值對象)
│   └── Transaction/
│
├── Application/             # 【應用層】 (Application Business Rules)
│   ├── Commands/            # -> CQRS: 寫入操作 (Use Cases)
│   │   └── DepositFunds/    #    每一個 Command 對應一個 Handler
│   └── Queries/             # -> CQRS: 讀取操作
│
└── Infrastructure/          # 【基礎設施層】 (Frameworks & Drivers)
    └── Persistence/
        └── AtlasAccountRepo.ts # -> Repository Implementation (倉儲實作)
```

---

## 2. 核心概念全解析

### 2.1 聚合根 (Aggregate Root)

**位置：** `src/Domain/Account/Account.ts`

**邏輯：**
聚合 (Aggregate) 是一組相關聯的物件集合，我們把它們視為資料修改的一個單元。而 **聚合根 (Aggregate Root)** 是這個集合中唯一的入口點。

*   **為什麼 `Account` 是聚合根？**
    *   所有的操作（存款、提款、轉帳）都必須透過 `Account` 類別的方法（`deposit`, `withdraw`）來進行。
    *   外部物件不能直接修改 `Account` 內部的狀態（如 `_balance`），甚至不能直接持有內部物件的參考。
    *   **交易邊界**：一次交易 (Transaction) 通常鎖定一個聚合根。

**程式碼特徵：**
*   擁有 `private` 屬性，保護內部狀態。
*   擁有表達業務意圖的方法（如 `deposit` 而不是 `setBalance`）。
*   負責維護 **Invariants (不變性)**，例如「餘額不能小於 0」。

#### 2.1.1 深度解析：為何 Account 是聚合根？

1.  **不變性 (Invariant) 的守護者**：
    *   銀行帳戶有一條鐵律：「餘額不能小於 0」（除非有透支額度）。
    *   如果我們允許外部直接修改餘額 (`account.balance -= 100`)，外部程式碼可能會不小心讓餘額變成負數，破壞了業務規則。
    *   作為聚合根，`Account` 強制所有修改都必須經過它的方法 (`withdraw`)，它可以在裡面檢查 `if (balance < amount) throw Error`。這保證了**無論外解如何呼叫，Account 的狀態永遠是合法的**。

2.  **交易的一致性邊界**：
    *   當我們說「儲存帳戶」時，我們是指儲存整個帳戶的當前狀態。我們不會只儲存「帳戶的一半」。
    *   Repository 只會提供 `save(account)`，而不會提供 `saveAccountBalance(id, balance)`。聚合根保證了資料寫入的原子性單位。

3.  **全域唯一標識 (Global Identity)**：
    *   `Account` 擁有全域唯一的 ID (`accountId`)。在這個系統中，只要知道 ID，我們就能找到這個特定的物件。這是聚合根的重要特徵。

#### 2.1.2 深度解析：為何 Transaction 只是 Entity？

在 `src/Domain/Transaction/Transaction.ts` 中，`Transaction` 是一個 **Entity (實體)**，但它通常不是聚合根，或者說它是一個「被動」的紀錄。

1.  **有 ID 但無行為 (Identity without Behavior)**：
    *   `Transaction` 有唯一的 ID，所以它是 Entity（不是 Value Object）。
    *   但它通常是**不可變的 (Immutable)**。一旦建立，就不會再修改（你不能修改一筆已經發生的交易金額）。
    *   因為它不需要維護複雜的狀態變化（沒有生命週期），它不需要像聚合根那樣保護內部狀態。

2.  **它是 Account 操作的「副作用 (Side Effect)」**：
    *   我們通常不會直接操作 `Transaction`。我們是操作 `Account`（存款），然後**產生**一筆 `Transaction` 紀錄。
    *   `Transaction` 的存在是為了稽核 (Audit) 和查詢歷史，而不是為了驅動業務邏輯。

3.  **生命週期依賴**：
    *   雖然在這個設計中，`Transaction` 有自己的 Repository (`TransactionRepository`)，這是為了查詢方便（顯示交易列表）。但在業務概念上，它是依附於 `Account` 的操作而產生的。



### 2.2 值對象 (Value Object)

**位置：** `src/Domain/Shared/Money.ts`

**邏輯：**
值對象是用來描述「特徵」的物件，它沒有唯一的 ID，而是由屬性值來定義等價性。

*   **為什麼 `Money` 是值對象？**
    *   我們不在乎這張 100 元鈔票是不是那張 100 元鈔票，我們只在乎它的面額是 100 元。
    *   **不可變性 (Immutability)**：`Money` 建立後不能修改。`money.add(other)` 會回傳一個**新的** `Money` 物件，而不是修改舊的。
    *   這避免了「副作用」，讓計算邏輯更安全。

### 2.3 倉儲模式 (Repository Pattern)

這是 DDD 中最容易混淆，但也最重要的設計之一。它分為 **介面 (Interface)** 與 **實作 (Implementation)** 兩部分。

#### A. 介面 (Interface)
**位置：** `src/Domain/Account/IAccountRepository.ts`
**層級：** **Domain Layer**

*   **邏輯：**
    *   這是領域層制定的「契約」。
    *   Domain 層宣告：「我需要儲存和讀取 Account 的能力，但我不在乎你用 SQL、NoSQL 還是檔案系統。」
    *   這讓 Domain 層保持純淨，不依賴任何外部框架 (Persistence Ignorance)。

#### B. 實作 (Implementation)
**位置：** `src/Infrastructure/Persistence/AtlasAccountRepository.ts`
**層級：** **Infrastructure Layer**

*   **邏輯：**
    *   這是基礎設施層對上述契約的「履行」。
    *   這裡包含具體的 SQL 語句、ORM 操作、資料庫連線。

**設計原則：依賴反轉 (Dependency Inversion Principle, DIP)**
*   **正確：** `Infrastructure` 依賴 `Domain` (實作依賴介面)。
*   **錯誤：** `Domain` 依賴 `Infrastructure` (業務邏輯直接 import SQL 模組)。

---

## 3. CQRS 運作邏輯

CQRS (Command Query Responsibility Segregation) 將系統分為「寫入」與「讀取」兩條路徑。

### 3.1 Command Side (寫入與命令)

**路徑：** `Command` -> `CommandHandler` -> `Repository` -> `Aggregate` -> `DB`

1.  **Command (`DepositFundsCommand`)**:
    *   只是一個 DTO (Data Transfer Object)，攜帶使用者的意圖（我要存錢）和參數（帳號、金額）。
    *   位置：`Applicaton/Commands/...`

2.  **Handler (`DepositFundsHandler`)**:
    *   **協調者**。它不做業務邏輯計算。
    *   **步驟**：
        1.  從 Repository 取出聚合根 (`accountRepo.findById`).
        2.  呼叫聚合根的方法 (`account.deposit`).
        3.  將聚合根存回 Repository (`accountRepo.save`).
    *   位置：`Application/Commands/...`

### 3.2 Query Side (讀取與查詢)

**路徑：** `Query` -> `QueryHandler` -> `Raw SQL / Read Model` -> `DTO`

*   在簡單的 CQRS 中，Query 也可以使用 Repository。
*   在進階的 CQRS 中，Query 會繞過 Domain Model，直接用 SQL 查詢最適合前端顯示的資料結構 (DTO)，以求最高效能。
*   **重點**：Query **絕對不能** 修改資料庫狀態。

---

## 4. 領域事件 (Domain Events)

**位置：** `src/Domain/Account/Events/...`

**邏輯：**
當聚合根的狀態發生改變時（例如餘額變動），它會產生一個「事件」。

1.  **副作用解耦**：
    *   如果不使用事件，`deposit` 方法裡可能要寫「寄信」、「更新報表」、「通知大數據平台」。這會讓 `Account` 變得臃腫且依賴過多。
    *   使用事件後，`Account` 只需要說「錢存進來了 (`FundsDeposited`)」，其他服務自己去監聽這個事件並做反應。

2.  **最終一致性**：
    *   CQRS 的讀取模型 (Read Model) 通常是透過訂閱這些事件來非同步更新的。

---

## 5. 總結：為什麼要這樣設計？

| 設計決策 | 好處 |
| :--- | :--- |
| **聚合根放在 Domain** | 保護業務規則，確保資料一致性，讓業務邏輯集中管理。 |
| **Repository 介面在 Domain** | 讓業務邏輯不依賴資料庫技術，方便寫單元測試 (Mock 介面即可)。 |
| **CQRS 分離** | 能夠針對「高併發讀取」做優化（例如讀寫分離資料庫），而不影響複雜的寫入邏輯。 |
| **Value Object** | 消除 `Primitive Obsession`（過度使用 int/string），讓程式碼更具語義且安全。 |

這套架構雖然初期開發成本較高（檔案較多），但對於**複雜度高、業務規則多、需要長期維護**的金融或企業級系統來說，是目前業界的最佳實踐之一。

---

## 6. 實戰技巧：快速分辨三者的決策樹

您可以透過以下兩個問題，快速判斷一個概念應該是 **Value Object**、**Entity** 還是 **Aggregate Root**。

### 步驟一：判斷是否為 Value Object
**問題：「如果我把這個物件換成另一個屬性完全相同的物件，它還是一樣的嗎？」**

*   **是 (Yes)** 👉 **Value Object (值對象)**
    *   **例子**：鈔票 (`Money`)、地址 (`Address`)、顏色 (`Color`)。
    *   **特徵**：沒有 ID，不可變 (Immutable)。你不在乎是「哪張」百元鈔，只在乎它是「一百元」。
    *   **口訣**：只在乎數值，不在乎身分。

*   **否 (No)** 👉 它是 **Entity (實體)**，進入步驟二。
    *   **例子**：使用者 (`User`)、訂單 (`Order`)。
    *   **特徵**：有唯一的 ID。即使兩個使用者都叫 "Alice"，ID 不同就是不同人。

### 步驟二：判斷是 Aggregate Root 還是普通 Entity
**問題：「這個 Entity 是否負責保護其他 Entity 的資料一致性？它是否能單獨存在？」**

*   **是 (Yes)** 👉 **Aggregate Root (聚合根)**
    *   **例子**：`Account` (銀行帳戶)、`Order` (訂單)。
    *   **特徵**：擁有 Repository，是資料庫讀寫的單位。外部只能透過它來修改內部狀態。
    *   **測試**：如果刪除它，底下的東西是否也要一起消失？(刪除 Order，OrderItems 也要消失 -> Order 是 Root)。

*   **否 (No)** 👉 **Internal Entity (內部實體)**
    *   **例子**：`OrderItem` (訂單明細)、`Transaction` (在某些設計下)。
    *   **特徵**：通常依附於聚合根存在，沒有自己的 Repository (或只有唯讀的)，不能脫離 Root 被單獨修改。


### ⚡️ 快速判斷表 (Cheatsheet)

| 特徵 | Value Object | Entity (一般) | Aggregate Root |
| :--- | :--- | :--- | :--- |
| **有 ID?** | ❌ 無 | ✅ 有 | ✅ 有 (全域唯一) |
| **可變性** | 🔒 不可變 | ✏️ 可變 | ✏️ 可變 |
| **生命週期** | 依附於宿主 | 依依附於 Root | 👑 獨立存在 |
| **Repository?** | ❌ 無 | ❌ 無 | ✅ 有 |
| **判斷關鍵** | 數值相等即相等 | 需追蹤歷史變化 | 交易與一致性的邊界 |

---

## 7. 實戰流程：從 User Story 到 Domain Model 的分析技巧

在 DDD 開發中，我們不應該憑空想像類別圖。最強大的技巧是「文本分析法」，直接從使用者的需求描述中「挖掘」出領域模型。

### 步驟 A：收集 User Stories (情境描述)
用最自然的語言寫下使用者的操作流程。

> **範例故事**：
> 「**顧客** (Customer) 想要把 **商品** (Product) 加入 **購物車** (Cart)。
> 如果 **商品庫存** (Stock) 不足，系統應該拒絕加入。
> 顧客可以隨時修改 **購買數量** (Quantity)，但不能超過 **最大購買限制** (Max Limit)。
> 最後顧客進行 **結帳** (Checkout)，系統會生成一張 **訂單** (Order) 並扣除庫存。」

### 步驟 B：名詞分析法 (找物件)
圈出故事中的名詞，它們通常對應到 Domain Model 的組件：

1.  **Customer (顧客)** -> 有 ID，有生命週期 -> **Aggregate Root** (或是 Entity，視上下文而定)。
2.  **Cart (購物車)** -> 包含多個商品，生命週期獨立 -> **Aggregate Root**。
3.  **Product (商品)** -> 在購物車情境中，我們只參照它的 ID 和價格快照 -> **Entity** (或被參考的 Root)。
4.  **Quantity (數量)** -> 只是數字 -> **Value Object** (屬性)。
5.  **Order (訂單)** -> 結帳後生成的獨立單據 -> **Aggregate Root**。

### 步驟 C：動詞分析法 (找行為與命令)
圈出故事中的動詞，它們對應到 Aggregate 的方法或 CQRS 的 Commands：

1.  **加入 (Join/Add)** -> `Cart.addItem(product, quantity)` -> **Command: AddItemToCart**。
2.  **拒絕 (Reject)** -> 這是業務規則 (Invariant) -> `stock.checkAvailability()`。
3.  **修改 (Update)** -> `Cart.updateItemQuantity(itemId, newQty)` -> **Command: UpdateCartItem**。
4.  **結帳 (Checkout)** -> `Cart.checkout()` -> **Command: CheckoutCart**。
5.  **生成 (Create/Generate)** -> `Order.createFromCart(cart)` -> Factory Method。

### 步驟 D：規則分析法 (找 Invariants)
找出「如果...就...」或「必須...」的限制條件：

1.  **"如果庫存不足，拒絕加入"** -> 這是一個跨 Aggregate 的檢核，通常放在 Domain Service (`InventoryService.checkStock`) 或在 Handler 中預先檢查。
2.  **"不能超過最大購買限制"** -> 這是 `Cart` 內部的規則 -> `CartItem.validateQuantity()`。

### 步驟 E：事件風暴 (Event Storming) - 找副作用
思考每個動作完成後，會發生什麼事（過去式）：

1.  結帳完成 -> **OrderPlaced (訂單已成立)**。
2.  **副作用**：
    *   寄送確認信 (Notification Service)。
    *   扣除庫存 (Inventory Context)。
    *   清空購物車 (Cart Context)。

### ✨ 總結：分析模板

把這個模板套用到每一個 User Story，你的 DDD 設計圖就會自動浮現：

| 分析維度 | 對應 DDD 概念 | 範例 (購物車) |
| :--- | :--- | :--- |
| **名詞 (Nouns)** | Aggregates, Entities, Value Objects | Cart, Product, CartItem |
| **動詞 (Verbs)** | Commands, Aggregate Methods | AddItem, UpdateQuantity, Checkout |
| **形容詞/條件 (Rules)** | Invariants (業務規則) | Quantity > 0, Stock >= Quantity |
| **結果 (Events)** | Domain Events | ItemAdded, CartCheckedOut |

透過這種結構化的分析，您就不會漏掉重要的業務邏輯，也能確保程式碼結構與業務需求高度一致。



