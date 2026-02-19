# DDD 戰略設計 (Strategic Design)

戰略設計是 Domain-Driven Design 的靈魂，它解決的是「大型系統如何拆分」與「團隊如何協作」的問題。

如果說戰術設計 (Entities, Aggregates) 是在教你如何蓋一間漂亮的房子，那麼戰略設計就是在教你如何規劃一座城市。

---

## 1. 核心概念：Bounded Context (界限上下文)

這是 DDD 中最重要的概念。一個名詞（模型）的意義，取決於它所處的 **上下文 (Context)**。

### 1.1 為什麼需要 Bounded Context？

想像一個電商系統中的 **"Product" (商品)**：

*   **銷售上下文 (Sales Context)**：關注價格、描述、圖片、促銷活動。
*   **庫存上下文 (Inventory Context)**：關注剩下幾件、擺在哪個貨架、重量體積。
*   **物流上下文 (Shipping Context)**：關注易碎品標記、包裝尺寸、海關編碼。

**傳統錯誤做法 (Monolithic Model)**：
試圖建立一個「大一統」的 `Product` 類別，包含上述所有屬性（`price`, `stock`, `shippingCode`...）。結果就是一個擁有 200 個欄位的 God Class，沒人敢改。

**DDD 正確做法**：
明確劃分邊界。
*   在 Sales Context 中，有一個 `SalesProduct`。
*   在 Inventory Context 中，有一個 `InventoryItem`。
*   它們雖然都指涉同一個物理商品，但在程式碼中是**完全不同**的類別，甚至可能有不同的 ID（SKU vs Barcode）。

### 1.2 如何識別 Bounded Context？

透過 **Event Storming** 或 **業務語言分析**：
*   當同一個名詞在不同部門有不同定義時（行銷部說「上架」，倉儲部說「入庫」）。
*   當業務規則完全不相關時（行銷改標語不需要經過倉儲同意）。
*   當資料變更頻率不同時（庫存每秒變，商品描述一年變一次）。

---

## 2. Context Mapping (上下文映射)

當我們把系統切分成多個 Bounded Context 後，它們之間如何溝通？這就是 Context Mapping。

| 模式 | 描述 | 適用場景 |
| :--- | :--- | :--- |
| **Partnership (合作夥伴)** | 兩個 Context 的團隊緊密合作，一起失敗或一起成功。 | 核心業務緊密相關，團隊溝通順暢。 |
| **Shared Kernel (共享內核)** | 兩個 Context 共用一個特定的資料模型 (Library/Jar)。**Money** Value Object 就是最常見的例子。 | 通用且穩定的基礎模型。 |
| **Customer-Supplier (客戶-供應商)** | 上游 (Supplier) 提供介面滿足下游 (Customer) 的需求。上游改動會直接影響下游。 | 常見的服務依賴關係。 |
| **ACL (Anti-Corruption Layer, 防腐層)** | 下游建立一個轉接層，將上游的模型轉換為自己的模型，保護自己不受上游變動影響。 | 串接老舊系統 (Legacy) 或外部不穩定的 API。 |
| **Open Host Service (OHS, 開放主機服務)** | 上游提供一套標準的公開協議 (REST/RPC)，讓所有下游自己來接。 | 公共 API 服務設計。 |
| **Published Language (PL, 發布語言)** | 雙方約定好的溝通格式 (XML, JSON Schema, Protobuf)。 | 跨組織或跨語言溝通。 |

---

## 3. Subdomains (子領域)

戰略設計還教我們如何分配資源（時間、預算、人力）。不是所有功能都一樣重要。

1.  **Core Domain (核心領域)** 💎
    *   公司的競爭優勢所在，最賺錢、最獨特的部分。
    *   **策略**：投入最強的團隊，使用最嚴謹的 DDD 戰術設計，自行開發。
    *   *例子：Uber 的「派車演算法」。*

2.  **Supporting Subdomain (支撐子領域)** 🛠️
    *   業務必需，但不是競爭優勢。
    *   **策略**：外包或使用簡單的 CRUD/Transaction Script 模式開發。
    *   *例子：Uber 的「客服系統」。*

3.  **Generic Subdomain (通用子領域)** 📦
    *   市面上已經有成熟解決方案的功能。
    *   **策略**：直接買現成的 (SaaS) 或使用開源庫。
    *   *例子：Uber 的「身分驗證 (Auth0)」、「金流 (Stripe)」。*

### 決策矩陣

| 類型 | 複雜度 | 競爭優勢 | 建議策略 |
| :--- | :--- | :--- | :--- |
| **Core** | 高 | 高 | **In-house DDD** |
| **Supporting** | 低/中 | 低 | **外包 / CRUD** |
| **Generic** | 高 | 低 | **購買 SaaS / Open Source** |

---

## 4. 總結

戰略設計告訴我們：
1.  **不要試圖建立一個完美的模型**，而是要在每個 Bounded Context 內建立「適用」的模型。
2.  **不要對所有功能一視同仁**，資源要集中在 Core Domain。
3.  **明確定義 Context 之間的關係**，不管是合作還是防腐，都要顯性化管理。
