# 🛰️ Gravito Satellite Specification (GASS) v1.0

這份文件定義了 Gravito 生態系中衛星模組（Satellite）的開發標準，旨在確保模組的高內聚、低耦合以及符合 **Galaxy Architecture** 的規範。

## 1. 核心哲學
- **UseCase 驅動**: 所有的業務邏輯必須封裝在 `@gravito/enterprise` 的 `UseCase` 類別中。
- **配置化優先**: 透過 `gravito.config.ts` 進行模組能力宣告與行為調整。
- **事件通訊**: 衛星之間應優先透過 `EventManager` 發送領域事件，避免直接 API 依賴。

## 2. 標準目錄結構
```text
src/
├── Domain/           # 業務模型 (Entities)、值對象 (ValueObjects)
├── Application/      # UseCases (業務流程)、DTOs、內部 Events
├── Infrastructure/   # Atlas Repositories、外部服務驅動
└── Interface/        # 控制器 (Controllers)、中間件、路由定義
```

## 3. 命名與註冊規範
- **類名**: 必須導出一個 `ServiceProvider`（如 `MembershipServiceProvider`）。
- **UseCase 命名**: `{Verb}{Noun}UseCase`（如 `CreateOrderUseCase`）。
- **領域事件**: `[module]:[action]`（如 `order:completed`）。

## 4. 品牌抽象化標準
所有的郵件或 UI 內容應遵循以下獲取模式：
```typescript
const brandingName = core.config.get('membership.branding.name', 'Default App');
```

## 5. 隊列配套標準
所有對外發出的副作用（Side Effects）動作應預設支援排程：
```typescript
// 優雅降級模式
async queue(job) {
  const queue = container.make('queue');
  if (queue) return queue.push(job);
  return this.send(job); // 同步回退
}
```

## 6. 驗證清單 (CI Checklist)
- [ ] 是否在 `satellites/` 目錄下？
- [ ] 是否導出了 `ServiceProvider`？
- [ ] 所有的 `require()` 是否已替換為 `import`？
- [ ] 是否包含 `README.md` 與 `docs/EXTENDING.md`？
- [ ] 是否通過了 `grand-review.ts` 整合測試？

## 7. 環境相容性與工具鏈避雷指南 (Pitfalls)

為了確保模組在 CI/CD 環境與各種執行環境（Bun/Node）下的穩定性，請務必遵循以下規範：

### A. TypeScript 指令衝突
- **陷阱**: 在本地開發時，若依賴包未建置，可能需要 `@ts-expect-error`；但 CI 環境中依賴包已就緒，會觸發「Unused Directive」錯誤。
- **規範**: 
  - 盡量避免使用指令。
  - 若必須使用，請優先選用 `@ts-ignore` 並配合 `// biome-ignore` 防止 Linter 自動將其修復回 `@ts-expect-error`。
  - 範例：
    ```typescript
    // biome-ignore lint/suspicious/noTsIgnore: 說明原因
    // @ts-ignore
    import { something } from '...'
    ```

### B. ESM 與路徑解析
- **陷阱**: `__dirname` 與 `require()` 在純 ESM 模式下會報錯或失效。
- **規範**: 
  - 衛星模組必須全面使用頂層 `import`。
  - 路徑解析請統一使用 `import.meta.dir` 與 `node:path` 模組。
  - 禁止在 `.ts` 檔案中使用 `require()`，這會導致某些打包工具（如 tsup）在處理 CJS/ESM 混用時發生崩潰。

### C. 依賴規範 (Monorepo)
- **規範**: 所有的 `@gravito/*` 或 `@gravito/core` 依賴必須標註為 `workspace:*` 並放入 `dependencies` 而非 `devDependencies`。
- **優點**: 確保測試與建置時始終連結到專案內最新的原始碼，而非 NPM 上的舊版本。

### D. 類型與值 (Imports)
- **陷阱**: 僅以 `import type` 導入類別（如 Mapper），但在代碼中將其作為實體調用，會導致 `ReferenceError`。
- **規範**: 若需要調用靜態方法或實例化，請確保使用標準 `import`。

### E. UseCase 實作規範
- **規範**: `UseCase` 的建構子應接收必要的 Repository 介面，並建議傳入 `PlanetCore` 實例以存取全域服務（如 `hasher`, `hooks`, `logger`）。
- **範例**:
  ```typescript
  export class RegisterMember extends UseCase<Input, Output> {
    constructor(private repository: IRepo, private core: PlanetCore) { super() }
  }
  ```

### F. 資料庫 Schema 一致性
- **陷阱**: 手動寫測試 Schema 時漏掉欄位（如 `email_verified_at`）。
- **規範**: 測試中的 `Schema.create` 應與 `Domain/Entities` 的屬性完全對齊，建議定期執行 `grand-review.ts` 進行全量欄位檢查。

---
*Created by Gravito Core Team.*
