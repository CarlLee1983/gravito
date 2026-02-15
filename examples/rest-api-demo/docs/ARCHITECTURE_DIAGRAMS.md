# 🏛️ 架構可視化指南

**用圖表理解 REST API Demo 的系統設計**

---

## 目錄

1. [整體系統架構](#整體系統架構)
2. [四層設計架構](#四層設計架構)
3. [用戶註冊流程](#用戶註冊流程)
4. [訂單建立流程](#訂單建立流程)
5. [事件驅動流程](#事件驅動流程)
6. [分層快取機制](#分層快取機制)
7. [安全認證流程](#安全認證流程)
8. [dependency 依賴圖](#dependency-依賴圖)

---

## 整體系統架構

```mermaid
graph TB
    Client["📱 客戶端<br/>Web/Mobile/API Client"]

    subgraph "🌐 API Layer"
        Gateway["API Gateway<br/>速率限制、CORS"]
        Routes["路由層<br/>Express/Hono"]
    end

    subgraph "🛡️ Middleware"
        Auth["認證中間件<br/>JWT/Session"]
        RateLimit["速率限制<br/>全局、IP、端點"]
        CSRF["CSRF 保護"]
        Security["安全頭部"]
    end

    subgraph "🎯 Core Application"
        Controllers["控制器層<br/>AuthController、UserController"]
        UseCases["Use Cases<br/>RegisterUser、LoginUser、CreateOrder"]
        DomainServices["領域服務<br/>UserDomainService、OrderDomainService"]
    end

    subgraph "💾 Data Layer"
        Repos["Repository 實現<br/>Database, Cache"]
        Database["PostgreSQL<br/>主資料庫"]
        Cache["Redis<br/>L2 快取層"]
        L1Cache["內存快取<br/>L1 快取層"]
    end

    subgraph "🔌 Event System"
        EventBus["事件總線<br/>EventManager"]
        Listeners["事件監聽器<br/>SendWelcomeEmail、UpdateStock"]
        DLQ["死信隊列<br/>失敗重試"]
    end

    subgraph "📊 Observability"
        Metrics["Prometheus 指標<br/>延遲、吞吐量、錯誤"]
        Tracing["分佈式追蹤<br/>Jaeger/OpenTelemetry"]
        Logs["日誌收集<br/>結構化日誌"]
    end

    Client -->|HTTP Request| Gateway
    Gateway --> Routes
    Routes --> Auth
    Auth --> RateLimit
    RateLimit --> CSRF
    CSRF --> Controllers

    Controllers --> UseCases
    UseCases --> DomainServices
    UseCases --> Repos

    Repos -->|讀/寫| L1Cache
    L1Cache -->|Cache Miss| Cache
    Cache -->|Cache Miss| Database

    UseCases --> EventBus
    EventBus --> Listeners
    Listeners -->|失敗| DLQ
    DLQ -->|重試| Repos

    Controllers -->|上報指標| Metrics
    UseCases -->|追蹤| Tracing
    Controllers -->|記錄日誌| Logs

    Controllers -->|HTTP Response| Client
```

---

## 四層設計架構

### 分層視圖

```mermaid
graph LR
    subgraph "Presentation Layer"
        C1["HTTP Routes"]
        C2["Controllers"]
        C3["Middleware"]
        C4["Request Validation"]
    end

    subgraph "Application Layer"
        A1["Use Cases"]
        A2["Application Services"]
        A3["DTO 轉換"]
    end

    subgraph "Domain Layer"
        D1["Entities"]
        D2["Value Objects"]
        D3["Domain Services"]
        D4["Domain Events"]
        D5["Repository Interface"]
    end

    subgraph "Infrastructure Layer"
        I1["Repository 實現"]
        I2["Database Access"]
        I3["Cache Implementation"]
        I4["Event Listeners"]
    end

    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> A1
    A1 --> A2
    A2 --> A3
    A3 --> D1
    A3 --> D2
    A3 --> D3
    D1 --> D4
    D3 -.->|depends on| D5
    D5 --> I1
    I1 --> I2
    I1 --> I3
    D4 --> I4

    style Presentation Layer fill:#e1f5ff
    style Application Layer fill:#fff3e0
    style Domain Layer fill:#f3e5f5
    style Infrastructure Layer fill:#e8f5e9
```

### 依賴流向

```
┌─────────────────────────┐
│  Presentation Layer     │  ← HTTP 請求/響應
│  (Controllers, Routes)  │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Application Layer      │  ← 業務流程協調
│  (Use Cases)            │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Domain Layer           │  ← 純業務邏輯
│  (Entities, Services)   │  ← 與框架無關
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Infrastructure Layer   │  ← 技術實現
│  (DB, Cache, Repos)     │
└─────────────────────────┘

⚠️ 重要：依賴流向單向向下，Domain Layer 不依賴其他層
```

---

## 用戶註冊流程

### 時序圖

```mermaid
sequenceDiagram
    participant Client as 客戶端
    participant Route as 路由層
    participant Controller as AuthController
    participant UseCase as RegisterUserUseCase
    participant Service as UserDomainService
    participant Repo as UserRepository
    participant DB as Database
    participant EventBus as EventManager
    participant Listener as EmailListener

    Client->>Route: POST /auth/register
    Route->>Controller: register(request)

    Controller->>Controller: 驗證輸入 (Zod Schema)

    Controller->>UseCase: execute(request)

    UseCase->>Service: isValidEmail(email)
    Service-->>UseCase: ✅/❌

    UseCase->>Repo: findByEmail(email)
    Repo->>DB: SELECT * FROM users WHERE email = ?
    DB-->>Repo: user or null
    Repo-->>UseCase: user or null

    alt 郵箱已存在
        UseCase-->>Controller: throw Error
        Controller-->>Client: 400 Bad Request
    else 新郵箱
        UseCase->>UseCase: 雜湊密碼 (bcrypt)
        UseCase->>Repo: create(createUserInput)
        Repo->>DB: INSERT INTO users VALUES (...)
        DB-->>Repo: user
        Repo-->>UseCase: user

        UseCase->>EventBus: dispatch(UserCreated)
        EventBus->>Listener: handle(UserCreated)
        Listener->>Listener: 發送歡迎郵件

        UseCase-->>Controller: RegisterUserResponse
        Controller-->>Client: 201 Created
    end
```

### 活動圖

```mermaid
stateDiagram-v2
    [*] --> ValidateInput

    ValidateInput --> ValidEmail: ✅ 格式正確
    ValidEmail --> ValidPassword: ✅ 密碼強度足夠
    ValidPassword --> CheckExists: ✅ 名字有效

    ValidEmail --> Error: ❌ 郵箱格式錯誤
    ValidPassword --> Error: ❌ 密碼不夠強
    CheckExists --> Error: ❌ 郵箱已被註冊

    CheckExists --> HashPassword: ✅ 郵箱唯一
    HashPassword --> CreateUser: ✅ 密碼雜湊完成

    CreateUser --> PersistDB: ✅ 用戶建立
    PersistDB --> DispatchEvent: ✅ 持久化成功
    DispatchEvent --> SendEmail: ✅ 事件發送
    SendEmail --> [*]: ✅ 完成

    Error --> [*]: ❌ 返回錯誤
```

---

## 訂單建立流程

### 業務流程圖

```mermaid
graph TD
    A["客戶提交訂單"] --> B["驗證輸入"]
    B --> C{庫存足夠?}

    C -->|否| C1["拒絕訂單"]
    C1 --> C2["返回 400"]

    C -->|是| D["建立訂單實體"]
    D --> E["扣減庫存"]
    E --> F["計算總價"]
    F --> G["保存到資料庫"]

    G --> H["發送 OrderCreated 事件"]

    H --> I{"監聽器"}
    I -->|UpdateStockListener| J["更新庫存快取"]
    I -->|ProcessPaymentListener| K["啟動支付流程"]
    I -->|InvalidateCacheListener| L["清除相關快取"]
    I -->|AuditLogListener| M["記錄審計日誌"]

    J --> N["返回 200 OK"]
    K --> N
    L --> N
    M --> N

    C2 -->|Error| O["返回響應"]
    N --> O
```

---

## 事件驅動流程

### 事件發布-訂閱模式

```mermaid
graph LR
    subgraph "Producer"
        UC["Use Case"]
        UC -->|dispatch| EM["EventManager"]
    end

    subgraph "Event Bus"
        EM -->|發布事件| EventQueue["事件隊列"]
    end

    subgraph "Consumers"
        EventQueue -->|UserCreated| L1["SendWelcomeEmailListener"]
        EventQueue -->|OrderCreated| L2["UpdateStockListener"]
        EventQueue -->|OrderCreated| L3["ProcessPaymentListener"]
        EventQueue -->|ProductUpdated| L4["InvalidateCacheListener"]
        EventQueue -->|PaymentCompleted| L5["SendConfirmationListener"]
    end

    subgraph "Outcomes"
        L1 -->|發送郵件| Email["📧 郵件服務"]
        L2 -->|更新庫存| Stock["📦 庫存系統"]
        L3 -->|啟動支付| Payment["💳 支付處理"]
        L4 -->|清除快取| Cache["🔄 快取層"]
        L5 -->|記錄日誌| Log["📊 審計日誌"]
    end

    style UC fill:#fff3e0
    style EventQueue fill:#f3e5f5
    style L1 fill:#e8f5e9
    style L2 fill:#e8f5e9
    style L3 fill:#e8f5e9
    style L4 fill:#e8f5e9
    style L5 fill:#e8f5e9
```

### 事件狀態機

```mermaid
stateDiagram-v2
    [*] --> EventDispatched

    EventDispatched --> Processing: 事件進入隊列
    Processing --> ListenerExecution: 觸發監聽器

    ListenerExecution --> Success: ✅ 執行成功
    ListenerExecution --> Failure: ❌ 執行失敗

    Success --> Completed
    Failure --> Retry: 重試 (指數退避)

    Retry --> RetrySuccess: ✅ 重試成功
    Retry --> RetryFailure: ❌ 重試仍然失敗

    RetrySuccess --> Completed
    RetryFailure --> DLQ: 發送到死信隊列

    DLQ --> Manual: 等待手動介入
    Completed --> [*]
    Manual --> [*]
```

---

## 分層快取機制

### 快取層次

```mermaid
graph TD
    A["應用層<br/>業務邏輯"] -->|查詢| B["L1 Cache<br/>內存快取<br/>30秒 TTL"]

    B -->|Cache Hit| C["返回結果"]
    B -->|Cache Miss| D["L2 Cache<br/>Redis<br/>5分鐘 TTL"]

    D -->|Cache Hit| E["回源 L1"]
    D -->|Cache Miss| F["Database<br/>PostgreSQL<br/>原始數據"]

    F -->|查詢結果| G["更新 L2"]
    G -->|緩存結果| H["更新 L1"]
    H --> C

    I["事件發生<br/>資料變更"] -->|修改| F
    I -->|失效| D
    D -->|失效| B

    style B fill:#c8e6c9
    style D fill:#81c784
    style F fill:#558b2f
    style C fill:#a5d6a7
```

### 快取失效流程

```mermaid
graph LR
    Event["業務事件<br/>ProductUpdated"] --> Dispatch["發送事件"]
    Dispatch --> Listener["InvalidateCacheListener"]

    Listener --> K1["刪除 L1 快取<br/>product:123"]
    Listener --> K2["刪除 L2 快取<br/>product:123"]

    K1 --> V1["驗證失效"]
    K2 --> V1
    V1 --> Success["✅ 快取一致性保證"]

    style Event fill:#ffcdd2
    style Listener fill:#f8bbd0
    style Success fill:#c8e6c9
```

---

## 安全認證流程

### 雙守衛認證架構

```mermaid
graph TD
    Request["HTTP 請求<br/>Authorization Header"]

    Request --> Extract["提取 Token"]

    Extract --> JWTGuard{"JWT 守衛<br/>检查 Token"}

    JWTGuard -->|有效| JWTVerify["驗證簽名"]
    JWTGuard -->|無效| SessionGuard{"Session 守衛<br/>檢查 Cookie"}

    JWTVerify -->|簽名有效| ExpiryCheck["檢查過期時間"]
    JWTVerify -->|簽名無效| Fail1["❌ 返回 401"]

    ExpiryCheck -->|未過期| BlacklistCheck["檢查黑名單"]
    ExpiryCheck -->|已過期| Fail2["❌ 返回 401"]

    BlacklistCheck -->|不在黑名單| Success["✅ JWT 認證成功"]
    BlacklistCheck -->|在黑名單| Fail3["❌ 返回 401"]

    SessionGuard -->|有效| SessionVerify["驗證 Session"]
    SessionGuard -->|無效| Fail4["❌ 返回 401"]

    SessionVerify -->|會話有效| Success
    SessionVerify -->|會話無效| Fail5["❌ 返回 401"]

    Success --> RBAC["RBAC 授權檢查"]
    RBAC -->|角色匹配| Allow["✅ 允許"]
    RBAC -->|角色不匹配| Deny["❌ 返回 403"]

    style Success fill:#c8e6c9
    style Allow fill:#a5d6a7
    style Fail1 fill:#ffcdd2
    style Fail2 fill:#ffcdd2
    style Fail3 fill:#ffcdd2
    style Fail4 fill:#ffcdd2
    style Fail5 fill:#ffcdd2
    style Deny fill:#ef9a9a
```

---

## Dependency 依賴圖

### 模塊依賴關係

```mermaid
graph TB
    subgraph "Domain Layer (純業務邏輯)"
        User["User<br/>實體"]
        Order["Order<br/>實體"]
        Product["Product<br/>實體"]
        UserDS["UserDomainService"]
        OrderDS["OrderDomainService"]
        UserEvent["UserCreated Event"]
        OrderEvent["OrderCreated Event"]
    end

    subgraph "Application Layer"
        RegisterUC["RegisterUser<br/>Use Case"]
        LoginUC["LoginUser<br/>Use Case"]
        CreateOrderUC["CreateOrder<br/>Use Case"]
    end

    subgraph "Infrastructure Layer"
        UserRepo["UserRepository<br/>實現"]
        OrderRepo["OrderRepository<br/>實現"]
        EventBus["EventManager"]
        EmailListener["EmailListener"]
        StockListener["StockListener"]
    end

    subgraph "Presentation Layer"
        AuthCtrl["AuthController"]
        OrderCtrl["OrderController"]
    end

    RegisterUC --> User
    RegisterUC --> UserDS
    RegisterUC --> UserRepo
    RegisterUC --> EventBus
    RegisterUC --> UserEvent

    LoginUC --> User
    LoginUC --> UserDS
    LoginUC --> UserRepo

    CreateOrderUC --> Order
    CreateOrderUC --> Product
    CreateOrderUC --> OrderDS
    CreateOrderUC --> OrderRepo
    CreateOrderUC --> EventBus
    CreateOrderUC --> OrderEvent

    AuthCtrl --> RegisterUC
    AuthCtrl --> LoginUC

    OrderCtrl --> CreateOrderUC

    EventBus --> EmailListener
    EventBus --> StockListener

    UserEvent --> EmailListener
    OrderEvent --> StockListener

    UserRepo -.->|實現| UserDS
    OrderRepo -.->|實現| OrderDS

    style RegisterUC fill:#fff3e0
    style LoginUC fill:#fff3e0
    style CreateOrderUC fill:#fff3e0
    style AuthCtrl fill:#e1f5ff
    style OrderCtrl fill:#e1f5ff
```

### Repository 依賴注入

```mermaid
graph LR
    Container["IoC 容器<br/>PlanetCore"]

    Container -->|bind| UserRepoInterface["UserRepository<br/>Interface"]
    UserRepoInterface -->|實現| UserRepoImpl["DatabaseUserRepository"]

    Container -->|bind| OrderRepoInterface["OrderRepository<br/>Interface"]
    OrderRepoInterface -->|實現| OrderRepoImpl["DatabaseOrderRepository"]

    Container -->|make| UC["RegisterUserUseCase"]
    UC -->|注入| UserRepoInterface

    UC -->|注入| EM["EventManager"]

    style Container fill:#f3e5f5
    style UC fill:#fff3e0
    style UserRepoInterface fill:#e1f5ff
    style UserRepoImpl fill:#e8f5e9
```

---

## 請求完整流程 End-to-End

```mermaid
graph LR
    A["1️⃣ 客戶端<br/>POST /auth/register"]
    B["2️⃣ 路由層<br/>匹配路由"]
    C["3️⃣ 中間件<br/>CORS、CSRF、Rate Limit"]
    D["4️⃣ 認證檢查<br/>JWT/Session"]
    E["5️⃣ 輸入驗證<br/>Zod Schema"]
    F["6️⃣ 控制器<br/>AuthController"]
    G["7️⃣ Use Case<br/>RegisterUserUseCase"]
    H["8️⃣ 領域服務<br/>驗證業務規則"]
    I["9️⃣ Repository<br/>查詢/保存"]
    J["🔟 事件發布<br/>EventManager"]
    K["1️⃣1️⃣ 事件監聽<br/>異步處理"]
    L["1️⃣2️⃣ 響應<br/>201 Created"]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J --> K --> L

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#fff3e0
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#fff3e0
    style H fill:#f3e5f5
    style I fill:#e8f5e9
    style J fill:#f3e5f5
    style K fill:#e8f5e9
    style L fill:#e1f5ff
```

---

## 性能監控架構

### 指標收集流程

```mermaid
graph TB
    subgraph "應用層"
        UC["Use Case"]
        Repo["Repository"]
        Listener["Event Listener"]
    end

    subgraph "監控層"
        Meter["Meter<br/>指標收集器"]
        Counter["計數器<br/>請求數、錯誤數"]
        Histogram["直方圖<br/>延遲分布"]
        Gauge["仪表<br/>活躍連接"]
    end

    subgraph "存儲層"
        Prometheus["Prometheus<br/>時間序列DB"]
    end

    subgraph "可視化層"
        Grafana["Grafana<br/>儀表板"]
        Alert["AlertManager<br/>告警規則"]
    end

    UC -->|記錄| Meter
    Repo -->|記錄| Meter
    Listener -->|記錄| Meter

    Meter -->|更新| Counter
    Meter -->|更新| Histogram
    Meter -->|更新| Gauge

    Counter -->|抓取| Prometheus
    Histogram -->|抓取| Prometheus
    Gauge -->|抓取| Prometheus

    Prometheus -->|查詢| Grafana
    Prometheus -->|查詢| Alert

    Alert -->|觸發| Notification["📢 通知"]

    style UC fill:#fff3e0
    style Meter fill:#e1f5ff
    style Prometheus fill:#f3e5f5
    style Grafana fill:#e8f5e9
```

---

## 數據一致性流程

### 事務與快取一致性

```mermaid
graph TD
    A["1. 開始事務<br/>BEGIN TRANSACTION"]
    B["2. 更新資料庫<br/>INSERT/UPDATE"]
    C["3. 提交事務<br/>COMMIT"]
    D["4. 發送事件<br/>EventManager.dispatch"]
    E["5. 監聽器執行<br/>失效快取"]
    F["6. 快取一致性保證<br/>✅ 完成"]

    A --> B --> C --> D --> E --> F

    G["❌ 異常發生<br/>e.g., 網絡錯誤"]
    H["回滾事務<br/>ROLLBACK"]
    I["跳過事件發布"]
    J["✅ 一致性保證"]

    C -.->|失敗| G
    G --> H --> I --> J

    style A fill:#fff3e0
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#e8f5e9
    style F fill:#c8e6c9
    style G fill:#ffcdd2
    style J fill:#c8e6c9
```

---

## 圖表使用指南

### 🎯 何時查看哪個圖表

| 想了解... | 查看圖表 |
|----------|---------|
| 整體系統架構 | [整體系統架構](#整體系統架構) |
| 四層設計 | [四層設計架構](#四層設計架構) |
| 用戶註冊細節 | [用戶註冊流程](#用戶註冊流程) |
| 訂單流程 | [訂單建立流程](#訂單建立流程) |
| 事件如何工作 | [事件驅動流程](#事件驅動流程) |
| 快取如何管理 | [分層快取機制](#分層快取機制) |
| 安全認證 | [安全認證流程](#安全認證流程) |
| 代碼依賴 | [Dependency 依賴圖](#dependency-依賴圖) |
| 完整請求過程 | [請求完整流程](#請求完整流程-end-to-end) |

### 💡 圖表圖例

```
┌─────────────┐
│ 方形 = 對象 │         ➡️ = 調用/依賴
├─────────────┤
│ 圓形 = 狀態 │         ⬇️ = 下一步
├─────────────┤
│ 菱形 = 決策 │         -.-> = 可選/條件
├─────────────┤
│ 顏色 = 層級 │         ⚠️ = 注意
└─────────────┘
```

---

## 導出圖表

所有圖表使用 **Mermaid** 語法，支持以下導出方式：

### 在線查看
- GitHub Markdown 自動渲染
- Mermaid Live Editor: https://mermaid.live

### 導出為圖片
```bash
# 使用 mermaid-cli
npm install -g mermaid-cli

# 導出為 PNG
mmdc -i file.md -o diagram.png

# 導出為 SVG
mmdc -i file.md -o diagram.svg
```

### 在文檔中使用
複製 Mermaid 代碼塊到你的 Markdown 文件即可使用。

---

**最後更新**：2026-02-14
**版本**：1.0
**作者**：Gravito Team

相關文檔：
- 📖 [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md)
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)
