import type { PlanetCore } from '@gravito/core'
import type { AccountController } from './Presentation/Controllers/AccountController'

/**
 * Route Registration Module
 *
 * 只負責路由映射，所有 HTTP 處理邏輯委派給 Controller。
 * 從 DI 容器解析 AccountController，確保依賴注入的一致性。
 *
 * **設計原則：**
 * - Route 只做路由注冊，不包含業務邏輯
 * - Controller 透過 DI 容器注入，支援測試替換
 * - 每個 endpoint 只有一行委派程式碼
 *
 * **7 Endpoints：**
 * - POST /api/accounts - 建立帳戶
 * - GET /api/accounts/:id - 取得帳戶明細
 * - GET /api/accounts/:id/balance - 取得餘額
 * - POST /api/accounts/:id/deposit - 存款
 * - POST /api/accounts/:id/withdraw - 提款
 * - POST /api/accounts/:id/transfer - 轉帳
 * - GET /api/accounts/:id/transactions - 交易歷史
 *
 * @param router - Photon 路由實例
 * @param core - PlanetCore 實例（用於從容器解析 Controller）
 *
 * @since 2.0.0
 */
export function registerRoutes(router: any, core: PlanetCore): void {
  // 從 DI 容器解析 Controller（含注入的 CommandBus/QueryBus）
  const accounts = core.container.make<AccountController>('controller.account')

  // ─── 帳戶管理 ───
  router.post('/api/accounts', (ctx: any) => accounts.createAccount(ctx))
  router.get('/api/accounts/:id', (ctx: any) => accounts.getDetails(ctx))

  // ─── 餘額查詢 ───
  router.get('/api/accounts/:id/balance', (ctx: any) => accounts.getBalance(ctx))

  // ─── 交易操作 ───
  router.post('/api/accounts/:id/deposit', (ctx: any) => accounts.deposit(ctx))
  router.post('/api/accounts/:id/withdraw', (ctx: any) => accounts.withdraw(ctx))
  router.post('/api/accounts/:id/transfer', (ctx: any) => accounts.transfer(ctx))

  // ─── 交易歷史 ───
  router.get('/api/accounts/:id/transactions', (ctx: any) => accounts.getTransactions(ctx))
}
