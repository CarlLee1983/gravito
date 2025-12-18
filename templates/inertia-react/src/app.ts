import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import type { PlanetCore } from 'gravito-core'
import { userRoute } from './routes/user'
import { apiRoute } from './routes/api'
import { createPagesRoute } from './routes/pages'

/**
 * 建立主應用程式
 *
 * 重要：必須使用 app.route() 方法來串接路由模組，
 * 這樣 Hono 才能推導出完整的 API 樹狀型別，供前端使用。
 *
 * @param core - PlanetCore 實例（用於頁面路由需要 core 的依賴）
 * @returns 應用程式實例和路由型別
 *
 * @example
 * ```typescript
 * // ✅ 正確：使用 app.route() 串接
 * const routes = app.route('/api/users', userRoute)
 *
 * // ❌ 錯誤：直接掛載無法推導型別
 * app.use('/api/users', userRoute)
 * ```
 */
export function createApp(core: PlanetCore) {
  const app = new Hono()

  // 全域中間件
  app.use('*', logger())

  // 靜態檔案
  app.use('/static/*', serveStatic({ root: './' }))
  app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }))

  // 建立頁面路由
  const pagesRoute = createPagesRoute(core)

  // 使用 app.route() 串接路由模組
  // 這是為了獲得完整 TypeScript 型別推導的必要寫法
  const routes = app
    .route('/', pagesRoute)
    .route('/api/users', userRoute)
    .route('/api', apiRoute)

  return { app, routes }
}

/**
 * 為了型別推導，我們需要建立一個完整的路由結構
 * 這個型別會被 types.ts 使用，供前端獲得完整的型別提示
 *
 * 注意：這個實例僅用於型別推導，實際的 app 會在 bootstrap 中建立
 * 頁面路由（pagesRoute）因為需要 core 依賴，所以不在這裡包含，
 * 但 API 路由的型別已經足夠前端使用
 */
function _createTypeOnlyApp() {
  const app = new Hono()
  const routes = app
    .route('/api/users', userRoute)
    .route('/api', apiRoute)
  return routes
}

// 導出路由的型別供 types.ts 使用
// 這個型別包含所有 API 路由的完整型別資訊
export type AppRoutes = ReturnType<typeof _createTypeOnlyApp>

