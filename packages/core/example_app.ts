import { Hono } from 'hono'
import { PlanetCore } from './src/PlanetCore'

// 1. 實例化核心
const core = new PlanetCore()

// 2. 測試 Hook: 註冊一個 Filter
// 假設有一個 hook 叫做 'filter_content'，我們會把內容轉成大寫
core.hooks.addFilter('filter_content', async (content: string) => {
  console.log('[Filter] Transforming content to uppercase...')
  return content.toUpperCase()
})

// 3. 測試 Hook: 註冊一個 Action
core.hooks.addAction<{ path: string }>('log_access', async ({ path }) => {
  console.log(`[Action] Access logged for: ${path}`)
})

// 4. 建立一個 Orbit (迷你 Hono app)
const myOrbit = new Hono()

myOrbit.get('/test', async (c) => {
  // 觸發 Action
  await core.hooks.doAction('log_access', { path: '/api/test' })

  // 原始資料
  const originalData = 'hello ecosystem'

  // 應用 Filter
  const filteredData = await core.hooks.applyFilters('filter_content', originalData)

  return c.json({
    original: originalData,
    filtered: filteredData,
    message: 'Orbit is functioning!',
  })
})

// 5. 掛載 Orbit
core.mountOrbit('/api', myOrbit)

// 6. 啟動 (Liftoff)
export default core.liftoff(3000)
