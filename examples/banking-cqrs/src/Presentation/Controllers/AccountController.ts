import {
  CreateAccountAction,
  DepositFundsAction,
  GetAccountBalanceAction,
  GetAccountDetailsAction,
  GetTransactionHistoryAction,
  TransferFundsAction,
  WithdrawFundsAction,
} from '../../Application/Actions/AccountActions'
import type { CommandBus } from '../../Application/Bus/CommandBus'
import type { QueryBus } from '../../Application/Bus/QueryBus'
import {
  createAccountSchema,
  depositSchema,
  transactionHistoryParamsSchema,
  transferSchema,
  withdrawSchema,
} from '../../Application/Schemas/AccountSchemas'
import { type HttpContext, HttpController } from '../HttpController'

/**
 * 帳戶 Controller
 *
 * 處理所有與銀行帳戶相關的 HTTP 端點。
 * 每個公開方法對應一個 API endpoint，內部委派給對應的 Action 執行業務邏輯。
 *
 * **7 個端點：**
 * | 方法 | 路徑 | 說明 |
 * |------|------|------|
 * | createAccount | POST /api/accounts | 建立帳戶 |
 * | getDetails | GET /api/accounts/:id | 取得帳戶明細 |
 * | getBalance | GET /api/accounts/:id/balance | 取得餘額 |
 * | deposit | POST /api/accounts/:id/deposit | 存款 |
 * | withdraw | POST /api/accounts/:id/withdraw | 提款 |
 * | transfer | POST /api/accounts/:id/transfer | 轉帳 |
 * | getTransactions | GET /api/accounts/:id/transactions | 交易歷史 |
 *
 * **職責：**
 * - 解析 HTTP 請求（body、params、query）
 * - 使用 Zod schema 驗證輸入
 * - 呼叫 Action 執行業務邏輯
 * - 格式化 HTTP 回應
 *
 * **不負責：**
 * - 業務規則（由 Action → Handler 處理）
 * - 資料存取（由 Repository 處理）
 * - 路由注冊（由 routes.ts 處理）
 *
 * @since 2.0.0
 */
export class AccountController extends HttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {
    super()
  }

  /**
   * POST /api/accounts -- 建立帳戶
   *
   * 建立一個新的銀行帳戶，初始餘額為 0。
   *
   * **請求格式：**
   * ```json
   * {
   *   "ownerName": "John Doe",
   *   "currency": "TWD"  // 選填，預設為 TWD
   * }
   * ```
   *
   * **回應格式 (201 Created)：**
   * ```json
   * {
   *   "success": true,
   *   "accountId": "uuid-here"
   * }
   * ```
   *
   * **錯誤：**
   * - 400: 請求格式不正確
   * - 409: 帳戶已存在
   * - 500: 資料庫錯誤
   */
  async createAccount(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const body = await ctx.req.json()
      const validated = createAccountSchema.parse(body)

      const action = new CreateAccountAction(this.commandBus)
      const result = await action.execute(validated)

      return this.success(ctx, undefined, 201, {
        accountId: result.accountId,
      })
    })
  }

  /**
   * GET /api/accounts/:id -- 取得帳戶明細
   *
   * 取得完整的帳戶資訊，包括餘額、狀態與時間戳。
   *
   * **回應格式 (200 OK)：**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "accountId": "uuid",
   *     "ownerName": "John Doe",
   *     "balanceCents": 500000,
   *     "balanceDollars": 5000.00,
   *     "currency": "TWD",
   *     "status": "active",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   }
   * }
   * ```
   *
   * **錯誤：**
   * - 404: 帳戶不存在
   * - 500: 資料庫錯誤
   */
  async getDetails(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const action = new GetAccountDetailsAction(this.queryBus)
      const result = await action.execute(accountId)

      return this.success(ctx, result)
    })
  }

  /**
   * GET /api/accounts/:id/balance -- 取得帳戶餘額
   *
   * 輕量級端點，快速取得當前餘額。
   *
   * **回應格式 (200 OK)：**
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "accountId": "uuid",
   *     "balanceCents": 500000,
   *     "balanceDollars": 5000.00,
   *     "currency": "TWD"
   *   }
   * }
   * ```
   *
   * **錯誤：**
   * - 404: 帳戶不存在
   * - 500: 資料庫錯誤
   */
  async getBalance(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const action = new GetAccountBalanceAction(this.queryBus)
      const result = await action.execute(accountId)

      return this.success(ctx, result)
    })
  }

  /**
   * POST /api/accounts/:id/deposit -- 存款
   *
   * 向帳戶存入資金。
   *
   * **請求格式：**
   * ```json
   * {
   *   "amount": 500.00,        // 元為單位
   *   "currency": "TWD"        // 選填，預設為 TWD
   * }
   * ```
   *
   * **回應格式 (200 OK)：**
   * ```json
   * { "success": true }
   * ```
   *
   * **錯誤：**
   * - 400: 金額或貨幣不正確
   * - 404: 帳戶不存在
   * - 409: 帳戶未啟用
   * - 500: 資料庫錯誤
   */
  async deposit(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const body = await ctx.req.json()
      const validated = depositSchema.parse(body)

      const action = new DepositFundsAction(this.commandBus)
      await action.execute(accountId, validated)

      return this.success(ctx)
    })
  }

  /**
   * POST /api/accounts/:id/withdraw -- 提款
   *
   * 從帳戶提取資金。
   *
   * **請求格式：**
   * ```json
   * {
   *   "amount": 100.00,        // 元為單位
   *   "currency": "TWD"        // 選填，預設為 TWD
   * }
   * ```
   *
   * **回應格式 (200 OK)：**
   * ```json
   * { "success": true }
   * ```
   *
   * **業務規則：**
   * - 不能提取超過餘額的金額
   * - 帳戶必須處於 ACTIVE 狀態
   *
   * **錯誤：**
   * - 400: 金額或貨幣不正確
   * - 404: 帳戶不存在
   * - 409: 帳戶未啟用
   * - 422: 餘額不足
   * - 500: 資料庫錯誤
   */
  async withdraw(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const body = await ctx.req.json()
      const validated = withdrawSchema.parse(body)

      const action = new WithdrawFundsAction(this.commandBus)
      await action.execute(accountId, validated)

      return this.success(ctx)
    })
  }

  /**
   * POST /api/accounts/:id/transfer -- 轉帳
   *
   * 將資金從一個帳戶轉移到另一個帳戶。
   *
   * **請求格式：**
   * ```json
   * {
   *   "toAccountId": "recipient-uuid",
   *   "amount": 250.00,        // 元為單位
   *   "currency": "TWD"        // 選填，預設為 TWD
   * }
   * ```
   *
   * **回應格式 (200 OK)：**
   * ```json
   * { "success": true }
   * ```
   *
   * **業務規則：**
   * - 單筆轉帳不得超過 100,000 TWD
   * - 轉出方必須有足夠的餘額
   * - 雙方帳戶都必須是 ACTIVE 狀態
   * - 帳戶必須使用相同貨幣（MVP 階段）
   *
   * **錯誤：**
   * - 400: 金額、貨幣或收款帳戶 ID 不正確
   * - 404: 轉出或收款帳戶不存在
   * - 409: 轉出帳戶未啟用
   * - 422: 餘額不足或轉帳超過上限
   * - 500: 資料庫錯誤
   */
  async transfer(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const body = await ctx.req.json()
      const validated = transferSchema.parse(body)

      const action = new TransferFundsAction(this.commandBus)
      await action.execute(accountId, validated)

      return this.success(ctx)
    })
  }

  /**
   * GET /api/accounts/:id/transactions -- 交易歷史
   *
   * 取得帳戶的分頁交易記錄，最新的交易優先排列。
   *
   * **查詢參數：**
   * - `limit`: 每頁筆數（預設 10，最大 1000）
   * - `offset`: 跳過的筆數，用於分頁（預設 0）
   *
   * **範例：**
   * - `/api/accounts/acc-123/transactions?limit=20&offset=0` - 前 20 筆
   * - `/api/accounts/acc-123/transactions?limit=20&offset=20` - 第 2 頁
   *
   * **回應格式 (200 OK)：**
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "txn-uuid",
   *       "accountId": "acc-123",
   *       "type": "deposit",
   *       "amountCents": 50000,
   *       "balanceAfterCents": 150000,
   *       "currency": "TWD",
   *       "referenceId": null,
   *       "description": null,
   *       "createdAt": "2024-01-15T14:30:00Z"
   *     }
   *   ]
   * }
   * ```
   *
   * **交易類型：**
   * - "deposit" - 存款
   * - "withdrawal" - 提款
   * - "transfer_out" - 轉出
   * - "transfer_in" - 轉入
   *
   * **錯誤：**
   * - 400: limit/offset 參數不正確
   * - 404: 帳戶不存在
   * - 500: 資料庫錯誤
   */
  async getTransactions(ctx: HttpContext): Promise<Response> {
    return this.execute(ctx, async () => {
      const accountId = ctx.req.param('id') as string
      const queryParams = {
        limit: ctx.req.query('limit') ?? '10',
        offset: ctx.req.query('offset') ?? '0',
      }

      const validated = transactionHistoryParamsSchema.parse(queryParams)
      const action = new GetTransactionHistoryAction(this.queryBus)
      const result = await action.execute(accountId, validated.limit, validated.offset)

      return this.success(ctx, result)
    })
  }
}
