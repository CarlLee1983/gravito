# Plan: satellites/marketing - DDD + DCI 重構

## Context

`satellites/marketing` 目前基礎代碼不完整，存在以下主要問題：
- `Marketing` Entity 過於簡陋（只有 name）
- `Coupon` 缺少業務方法（activate、disable、use、expireCheck）
- `PromotionEngine` 直接執行 SQL 查詢，無 Domain 層 Promotion Entity
- `CouponService` 充滿 `any` 類型、未驗證的轉換
- 完全缺少 DCI（Data, Context, Interaction）架構
- 無 ValueObjects、無 Domain Events、無輸入驗證
- 無 DTOs、無統一 Error 類型
- 無 HTTP 完整端點
- 單元測試幾乎空白

參考架構：`membership` 和 `flash-sale` 的 DCI 模式。

---

## 分支策略

```bash
# 已在 .worktrees/worktree-marketing-dci 工作
cd .worktrees/worktree-marketing-dci/satellites/marketing/
```

---

## 目標目錄結構

```
satellites/marketing/src/
├── index.ts                              ← MarketingServiceProvider（更新 IoC 綁定）
│
├── Domain/
│   ├── Contracts/
│   │   ├── ICouponRepository.ts          ← 新增：findById、findByCode、updateUsage
│   │   └── IPromotionRepository.ts       ← 新增：findById、findAll、findActive
│   ├── Entities/
│   │   ├── Coupon.ts                     ← 修復：新增 use/disable/activate/isExpired/canUse
│   │   └── Promotion.ts                  ← 新增：完整 Promotion AggregateRoot
│   ├── ValueObjects/
│   │   ├── CouponCode.ts                 ← 新增：驗證代碼格式（大寫英數、6-20 字元）
│   │   ├── CouponStatus.ts               ← 新增：ACTIVE | DISABLED | EXPIRED
│   │   ├── DiscountValue.ts              ← 新增：驗證金額（fixed 或 percentage）
│   │   ├── PromotionType.ts              ← 新增：CART_THRESHOLD | BUY_X_GET_Y 等
│   │   ├── PromotionStatus.ts            ← 新增：ACTIVE | INACTIVE | EXPIRED
│   │   └── PromotionPriority.ts          ← 新增：驗證優先級（1-100）
│   └── DCI/
│       ├── Roles/
│       │   ├── CouponIssuerRole.ts       ← 新增：create/activate/disable coupon
│       │   ├── CouponValidatorRole.ts    ← 新增：validate/check expiry/usage limit
│       │   ├── PromotionApplierRole.ts   ← 新增：apply promotion to order
│       │   └── CouponRedeemRole.ts       ← 新增：redeem coupon after order placed
│       └── Contexts/
│           ├── IssueCouponContext.ts     ← 新增：發行折價券流程
│           ├── ValidateCouponContext.ts  ← 新增：驗證折價券流程
│           ├── RedeemCouponContext.ts    ← 新增：核銷折價券流程（order 完成後）
│           ├── ApplyPromotionContext.ts  ← 新增：套用促銷活動流程
│           ├── DeactivatePromotionContext.ts  ← 新增：關閉促銷活動流程
│           └── CreatePromotionContext.ts ← 新增：建立促銷活動流程
│
├── Application/
│   ├── DTOs/
│   │   ├── CouponDTO.ts                  ← 新增：輸出 DTO + Mapper
│   │   ├── PromotionDTO.ts               ← 新增：輸出 DTO + Mapper
│   │   └── MarketingAdjustmentDTO.ts     ← 新增：調整項 DTO
│   ├── Errors/
│   │   ├── CouponError.ts                ← 新增：CouponNotFoundError、ExpiredError、UsageLimitExceededError
│   │   └── PromotionError.ts             ← 新增：PromotionNotFoundError、InvalidConfigError
│   ├── Services/
│   │   ├── CouponService.ts              ← 修改：薄壳，委派 Contexts
│   │   └── PromotionEngine.ts            ← 修改：薄壳，委派 ApplyPromotionContext
│   └── UseCases/
│       ├── IssueCoupon.ts                ← 新增：委派 IssueCouponContext
│       ├── DeactivateCoupon.ts           ← 新增：委派 disable coupon
│       ├── GetCoupon.ts                  ← 新增：委派 CouponRepository
│       ├── ListCoupons.ts                ← 新增：列表查詢
│       ├── ValidateCoupon.ts             ← 新增：驗證優惠券有效性
│       ├── RedeemCoupon.ts               ← 新增：核銷優惠券
│       ├── CreatePromotion.ts            ← 新增：委派 CreatePromotionContext
│       ├── DeactivatePromotion.ts        ← 新增：委派 DeactivatePromotionContext
│       ├── GetPromotion.ts               ← 新增：委派 PromotionRepository
│       ├── ListPromotions.ts             ← 新增：列表查詢
│       └── AdminListCoupons.ts           ← 修改：瘦壳化
│
├── Infrastructure/
│   └── Persistence/
│       ├── Repositories/
│       │   ├── AtlasCouponRepository.ts  ← 新增/修改：實現 ICouponRepository
│       │   ├── AtlasPromotionRepository.ts ← 新增：實現 IPromotionRepository
│       │   └── Migrations/
│       │       ├── 20250101_create_coupons_table.ts (已有)
│       │       └── 20250102_create_promotions_table.ts (已有)
│       └── PromotionRuleFactory.ts       ← 新增：規則工廠（替代 switch 語句）
│
└── Interface/
    └── Http/
        └── Controllers/
            ├── CouponController.ts       ← 新增：6 個 HTTP 端點（issue、validate、redeem、disable、get、list）
            ├── PromotionController.ts    ← 新增：5 個 HTTP 端點（create、deactivate、get、list、check）
            └── AdminMarketingController.ts ← 修改：端點統一化、Zod 驗證
```

---

## 實作步驟

### Phase 1 - Domain 層 ValueObjects 與 Contracts

1. **新增 `ValueObjects/`**：
   - `CouponCode.ts`: code 格式驗證（大寫英數、6-20 字元）
   - `CouponStatus.ts`: ACTIVE | DISABLED | EXPIRED
   - `DiscountValue.ts`: {type: 'FIXED'|'PERCENTAGE', amount: number} + 驗證
   - `PromotionType.ts`: ENUM（CART_THRESHOLD、BUY_X_GET_Y 等）
   - `PromotionStatus.ts`: ACTIVE | INACTIVE | EXPIRED
   - `PromotionPriority.ts`: 1-100 優先級驗證

2. **新增 `Contracts/`**：
   - `ICouponRepository.ts`: findById、findByCode、create、update、delete、listActive
   - `IPromotionRepository.ts`: findById、findAll、findActive、create、update、delete

### Phase 2 - Domain Entities 修復與擴充

3. **修復 `Entities/Coupon.ts`**：
   - 新增所有方法：use()、disable()、activate()、isExpired()、canUse()、getRemainingUsage()
   - 使用 ValueObjects 取代原始型別
   - 所有狀態變更都返回新物件（immutability）

4. **新增 `Entities/Promotion.ts`**（完整 AggregateRoot）：
   - properties: type、name、configuration、priority、startsAt、expiresAt、status
   - methods: apply()、deactivate()、isActive()、isExpired()、matchesOrder()

### Phase 3 - DCI Roles

5. **新增 `DCI/Roles/`**：
   - `CouponIssuerRole.ts`: create coupon with validation
   - `CouponValidatorRole.ts`: check validity, expiry, usage limit
   - `CouponRedeemRole.ts`: record usage after order placed
   - `PromotionApplierRole.ts`: apply promotions to order, calculate adjustments

### Phase 4 - DCI Contexts

6. **新增 `DCI/Contexts/`**：
   - `IssueCouponContext.ts`: 驗證 → 注入 CouponIssuer → create → save
   - `ValidateCouponContext.ts`: 查找 → 注入 Validator → check
   - `RedeemCouponContext.ts`: 查找 → 更新 usage → save
   - `ApplyPromotionContext.ts`: 獲取所有活躍促銷 → 注入 Applier → apply
   - `CreatePromotionContext.ts`: 驗證配置 → create → save
   - `DeactivatePromotionContext.ts`: 查找 → deactivate → save

### Phase 5 - Application DTOs 與 Errors

7. **新增 `Errors/`**：
   - `CouponError.ts`: CouponNotFoundError、ExpiredError、UsageLimitExceededError、InvalidCodeError
   - `PromotionError.ts`: PromotionNotFoundError、InvalidConfigError、PromotionNotActiveError

8. **新增 `DTOs/`**：
   - `CouponDTO.ts`: 輸出格式、couponToDTO() mapper
   - `PromotionDTO.ts`: 輸出格式、promotionToDTO() mapper
   - `MarketingAdjustmentDTO.ts`: 調整項 DTO

### Phase 6 - Application UseCases

9. **新增/修改 `UseCases/`**：
   - `IssueCoupon.ts`: 薄壳，委派 IssueCouponContext
   - `DeactivateCoupon.ts`: 薄壳，委派 disable
   - `GetCoupon.ts`: 查詢單個 coupon
   - `ListCoupons.ts`: 分頁列表
   - `ValidateCoupon.ts`: 驗證有效性（for checkout）
   - `RedeemCoupon.ts`: 核銷（order 完成時觸發）
   - `CreatePromotion.ts`: 委派 CreatePromotionContext
   - `DeactivatePromotion.ts`: 委派 DeactivatePromotionContext
   - `GetPromotion.ts`: 查詢單個 promotion
   - `ListPromotions.ts`: 分頁列表
   - `AdminListCoupons.ts`: 瘦壳化（原有改造）

### Phase 7 - Infrastructure 層

10. **新增/修改 Repository**：
    - 新增 `AtlasCouponRepository.ts`
    - 新增 `AtlasPromotionRepository.ts`
    - 新增 `PromotionRuleFactory.ts`（取代 PromotionEngine 中的 switch）

### Phase 8 - Interface 層

11. **新增完整 Controllers**：
    - `CouponController.ts`: POST /coupons（發行）、GET /coupons/:id、GET /coupons（列表）、POST /coupons/:id/validate（驗證）、POST /coupons/:id/redeem（核銷）、PATCH /coupons/:id/deactivate（停用）
    - `PromotionController.ts`: POST /promotions（建立）、GET /promotions/:id、GET /promotions（列表）、PATCH /promotions/:id/deactivate（關閉）、POST /promotions/check（檢查適用）
    - `AdminMarketingController.ts`: 統一化、移除 `any`

12. **新增 Zod Schemas**：
    - issueCouponSchema、validateCouponSchema、createPromotionSchema 等

### Phase 9 - ServiceProvider 更新

13. **修改 `index.ts`**：
    - 新增 6 個 Context 綁定
    - 新增 10+ UseCase 綁定
    - 新增 2 個 Repository 綁定
    - 新增 HTTP 路由（CouponController、PromotionController）
    - 保留並調整 hook（commerce:order:adjustments、commerce:order-placed）

### Phase 10 - 測試

14. **修復/新增 `tests/`**：
    - `domain.test.ts` (30+ 測試): ValueObjects、Coupon、Promotion
    - `dci.test.ts` (20+ 測試): Roles 和 Contexts 協調
    - `unit.test.ts` (20+ 測試): UseCase 層
    - `integration.test.ts` (15+ 測試): Repository + Contexts 整合

---

## 驗證方式

```bash
cd .worktrees/worktree-marketing-dci/satellites/marketing

# 型別檢查
bun run typecheck

# 測試
bun test --verbose

# 完整構建
cd ..
cd ..
bun run build
```

目標：
- [ ] 無任何 `any` 類型
- [ ] 無 mutation（全 immutable）
- [ ] DCI Roles + Contexts 完整 6 個
- [ ] 測試覆蓋率 > 75%（domain + DCI + usecase）
- [ ] Controllers 完整 6 + 5 = 11 個端點
- [ ] typecheck 零錯誤

---

## 關鍵檔案

| 檔案 | 角色 |
|------|------|
| `src/Domain/Entities/Coupon.ts` | 主 Entity，需修復業務方法 |
| `src/Domain/Entities/Promotion.ts` | 新增：完整 AggregateRoot |
| `src/Domain/DCI/Roles/` | 新增：4 個核心 Roles |
| `src/Domain/DCI/Contexts/` | 新增：6 個 Contexts |
| `src/Application/UseCases/` | 新增/修改：10+ UseCases |
| `src/Infrastructure/Persistence/Repositories/` | 新增：2 個 Repositories |
| `src/Interface/Http/Controllers/` | 新增：2 個 Controllers、11 個端點 |
