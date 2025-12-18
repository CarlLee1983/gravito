/**
 * 型別定義檔案
 *
 * 重要：此檔案僅導出型別，不引入任何 runtime 依賴。
 * 這樣前端專案在 import 時才不會報錯（因為前端環境沒有 Bun/Node runtime）。
 *
 * 使用 import type 確保只引入型別資訊，不會執行任何程式碼。
 */
import type { AppRoutes } from './app'

/**
 * 應用程式的路由型別
 * 從 app.ts 推導而來，包含所有 API 端點的完整型別資訊
 */
export type { AppRoutes }

