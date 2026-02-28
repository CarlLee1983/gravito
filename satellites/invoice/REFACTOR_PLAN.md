# Invoice Satellite - DDD + DCI 重構計畫

## 📋 概述

將 `satellites/invoice` 從基礎 DDD 架構升級為完整的 **DDD + DCI** 實現，引入角色（Roles）和上下文（Contexts）以支持複雜的業務流程編排。

## 🎯 目標

- ✅ 強化 Domain 層（ValueObject、Error 類別）
- ✅ 引入 DCI Roles（InvoiceIssuer、InvoiceCanceller、InvoiceTracker）
- ✅ 實現 DCI Contexts（InvoiceIssuance、InvoiceCancellation、InvoiceAudit）
- ✅ 薄殼化 UseCase（委派到 Context）
- ✅ 完整型別定義（零 `as any`）
- ✅ 80%+ 測試覆蓋率

## 📊 分段計畫

### Phase 1：Domain 層強化（基礎設施）

**檔案清單：**
1. `src/Domain/Errors/InvoiceError.ts` - 錯誤基類
2. `src/Domain/ValueObjects/InvoiceNumber.ts` - 發票號碼 VO
3. `src/Domain/ValueObjects/InvoiceTax.ts` - 稅額 VO
4. `src/Domain/ValueObjects/InvoiceAmount.ts` - 金額 VO
5. `src/Domain/ValueObjects/InvoiceStatus.ts` - 狀態 VO
6. 強化 `src/Domain/Entities/Invoice.ts` - 添加驗證與狀態轉換

**改進點：**
- 提取發票號碼、稅額、金額、狀態為 ValueObject
- 添加領域錯誤類別（DuplicateInvoice、InvalidAmount、InvalidTransition）
- 強化 Invoice Entity 的狀態機（cancel()、return()、verify()）
- 移除 mutation，使用不變性模式

**預期測試：**
- VO 單元測試 (20 個)
- Entity 狀態轉換測試 (15 個)
- 總計：35 個測試

**驗收條件：**
- [ ] 所有 VO 創建完成
- [ ] Entity 強化完成
- [ ] TypeScript 類型檢查通過
- [ ] 35 個測試全部通過

---

### Phase 2：DCI Roles + Contexts（業務流程編排）

#### A. 角色定義（3 個 Roles）

**1. InvoiceIssuerRole.ts** - 發票開立者
```typescript
export interface InvoiceIssuerRole {
  generateInvoiceNumber(): string
  calculateTax(amount: number, taxRate: number): number
  validateOrderForInvoicing(orderId: string): Promise<boolean>
}
```

**2. InvoiceCancellerRole.ts** - 發票取消者
```typescript
export interface InvoiceCancellerRole {
  validateCancellationEligibility(invoice: Invoice): boolean
  recordCancellationReason(reason: string): void
  notifyRelatedServices(): Promise<void>
}
```

**3. InvoiceTrackerRole.ts** - 發票追蹤者
```typescript
export interface InvoiceTrackerRole {
  trackInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>
  auditTrail(invoiceId: string): Promise<AuditLog[]>
  generateReport(startDate: Date, endDate: Date): Promise<InvoiceReport>
}
```

#### B. 上下文定義（3 個 Contexts）

**1. InvoiceIssuanceContext.ts** - 發票開立流程
```typescript
export class InvoiceIssuanceContext {
  // 參與者
  issuer: InvoiceIssuerRole
  repository: IInvoiceRepository
  eventBus: IEventBus

  // 編排流程
  async orchestrate(input: IssueInvoiceInput): Promise<Invoice> {
    // 1. 驗證訂單
    // 2. 檢查重複
    // 3. 生成發票號碼
    // 4. 計算稅額
    // 5. 創建 Invoice Entity
    // 6. 保存
    // 7. 發佈事件
  }
}
```

**2. InvoiceCancellationContext.ts** - 發票取消流程
```typescript
export class InvoiceCancellationContext {
  // 參與者
  canceller: InvoiceCancellerRole
  repository: IInvoiceRepository
  eventBus: IEventBus

  // 編排流程
  async orchestrate(invoiceId: string, reason: string): Promise<void> {
    // 1. 查詢 Invoice
    // 2. 驗證取消資格
    // 3. 記錄取消原因
    // 4. 更新狀態為 CANCELLED
    // 5. 通知相關服務
    // 6. 發佈事件
  }
}
```

**3. InvoiceAuditContext.ts** - 發票審計追蹤
```typescript
export class InvoiceAuditContext {
  // 參與者
  tracker: InvoiceTrackerRole
  repository: IInvoiceRepository
  auditLog: IAuditLogRepository

  // 編排流程
  async queryStatus(invoiceId: string): Promise<InvoiceStatus>
  async getAuditTrail(invoiceId: string): Promise<AuditLog[]>
  async generateReport(period: DateRange): Promise<InvoiceReport>
}
```

**測試檔案：**
- `tests/Application/Roles/InvoiceIssuerRole.test.ts` (6 個測試)
- `tests/Application/Roles/InvoiceCancellerRole.test.ts` (6 個測試)
- `tests/Application/Roles/InvoiceTrackerRole.test.ts` (5 個測試)
- `tests/Application/Contexts/InvoiceIssuanceContext.test.ts` (7 個測試)
- `tests/Application/Contexts/InvoiceCancellationContext.test.ts` (6 個測試)
- `tests/Application/Contexts/InvoiceAuditContext.test.ts` (5 個測試)

**預期測試：**
- 3 個 Role 角色：17 個測試
- 3 個 Context 上下文：18 個測試
- 總計：35 個測試

**驗收條件：**
- [ ] 3 個 Roles 完成 + 注入函式
- [ ] 3 個 Contexts 完成（完整流程編排）
- [ ] 35 個測試全部通過
- [ ] TypeScript 型別檢查通過
- [ ] 零 `as any`、零 `@ts-expect-error`

---

### Phase 3：UseCase 薄殼化 + 強化 Repository

**修改 UseCase：**
1. `IssueInvoice.ts` - 委派到 InvoiceIssuanceContext
2. `CancelInvoice.ts` - 委派到 InvoiceCancellationContext（新建）
3. `QueryInvoiceStatus.ts` - 委派到 InvoiceAuditContext（新建）

**強化 Repository：**
1. 添加 `findBynvoiceNumber()` - 按發票號碼查詢
2. 添加 `findByStatus()` - 按狀態查詢
3. 添加 `findByDateRange()` - 按日期範圍查詢

**預期測試：**
- UseCase 集成測試 (9 個)

**驗收條件：**
- [ ] 所有 UseCase 委派到對應 Context
- [ ] Repository 新增查詢方法
- [ ] 9 個集成測試通過

---

### Phase 4：Controller 適配 + 清理

**改進 Controller：**
1. `AdminInvoiceController.ts` - 移除 `as any`、使用 DTO
2. 添加錯誤處理（捕捉領域異常）
3. 完整的 API 端點（issue、cancel、query、list）

**測試：**
- Controller 單元測試 (8 個)

**驗收條件：**
- [ ] 所有 API 端點完成
- [ ] 零 `as any`、零 `@ts-expect-error`
- [ ] 8 個 Controller 測試通過

---

## 📈 預期成果

| 階段 | 檔案數 | 測試數 | 主要成果 |
|------|--------|---------|---------|
| Phase 1 | 6 | 35 | Domain 層強化 |
| Phase 2 | 6 + 6 | 35 | Roles + Contexts |
| Phase 3 | 3 + 1 | 9 | UseCase 薄殼化 |
| Phase 4 | 1 | 8 | Controller 適配 |
| **總計** | **~23** | **~87** | **完整 DDD + DCI** |

**最終指標：**
- ✅ 87 個單元/集成測試（100% 通過）
- ✅ 零 `as any`、零 `@ts-expect-error`
- ✅ 完整 TypeScript 型別檢查
- ✅ 100% Domain 層覆蓋率
- ✅ 80%+ 應用層覆蓋率

---

## 🚀 開始時機

**當前狀態：**
- Worktree 已建立：`worktree-invoice-ddd-dci`
- 分支名稱：`worktree-invoice-ddd-dci`
- 位置：`.claude/worktrees/invoice-ddd-dci`

**下一步：**
1. 執行 Phase 1 - Domain 層強化
2. 驗證所有測試通過 (35 個)
3. TypeScript 類型檢查通過
4. 進入 Phase 2

---

## 📝 注意事項

- **不變性原則**：所有 Entity 操作返回新對象，禁止 mutation
- **錯誤處理**：使用領域錯誤類別，禁止拋出 Error
- **事件驅動**：重要操作應發佈領域事件
- **Satellite 隔離**：不與其他 Satellite 直接耦合
- **代碼風格**：100 字元寬、2 空格、單引號、無分號

