#!/usr/bin/env bun
/**
 * 為 SPA 路由生成對應的 HTML 文件
 *
 * 這個腳本會在構建後為每個路由生成對應的 index.html 文件
 * 這樣當用戶直接訪問 /features 等路由時，服務器可以返回正確的 HTML
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const routes = [
  '/',
  '/features',
  '/docs/cli',
  '/docs/benchmark',
  '/docs/mongodb',
  '/docs/redis',
  '/docs/legal',
]

async function generateSPARoutes() {
  const distDir = join(process.cwd(), 'dist')
  const indexPath = join(distDir, 'index.html')

  console.log('📦 Generating SPA route files...')
  console.log('📂 Dist directory:', distDir)
  console.log('📂 Index file:', indexPath)

  // 讀取主 index.html
  let indexHtml: string
  try {
    indexHtml = await readFile(indexPath, 'utf-8')
    console.log('✅ Read index.html')
  } catch (error) {
    console.error('❌ Failed to read index.html:', error)
    process.exit(1)
  }

  // 為每個路由生成對應的 HTML 文件
  for (const route of routes) {
    if (route === '/') {
      continue // 跳過根路由，已經存在
    }

    // 移除開頭的斜線並構建路徑
    const routePath = route.replace(/^\//, '')
    const routeDir = join(distDir, routePath)
    const routeIndexPath = join(routeDir, 'index.html')

    try {
      // 創建目錄
      await mkdir(routeDir, { recursive: true })

      // 修正 HTML 中的資源路徑
      // Vite 已經使用絕對路徑（/assets/...），所以我們只需要確保 BASE_URL 占位符被正確替換
      let routeHtml = indexHtml

      // 確保 BASE_URL 被正確替換為根路徑
      routeHtml = routeHtml.replace(/%BASE_URL%/g, '/')

      // 如果 Vite 使用了相對路徑（不應該，但以防萬一），修正它們
      // 查找所有以 ./assets/ 或 assets/ 開頭的資源引用，確保它們使用絕對路徑
      routeHtml = routeHtml.replace(/(href|src)=["'](\.\/)?assets\//g, (_match, attr) => {
        // 確保使用絕對路徑（以 / 開頭）
        return `${attr}="/assets/`
      })

      // 添加路由修正腳本：當訪問 /features/index.html 時，重定向到 /features
      // 這個腳本需要在 Vue 應用啟動之前執行
      const routeFixScript = `
    <script>
        // 修正 SPA 路由：當訪問 /features/index.html 時，重定向到 /features
        (function() {
            var currentPath = window.location.pathname;
            // 如果當前路徑以 /index.html 結尾且不是根路徑，重定向到對應的路徑
            if (currentPath.endsWith('/index.html') && currentPath !== '/index.html') {
                var cleanPath = currentPath.replace(/\\/index\\.html$/, '') || '/';
                if (cleanPath !== currentPath) {
                    window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
                }
            }
        })();
    </script>`

      // 在 </head> 標籤之前插入路由修正腳本
      routeHtml = routeHtml.replace('</head>', routeFixScript + '\n</head>')

      // 寫入 HTML 文件
      await writeFile(routeIndexPath, routeHtml, 'utf-8')
      console.log(`✅ Generated: ${route}/index.html`)
    } catch (error) {
      console.error(`❌ Failed to generate ${route}/index.html:`, error)
      process.exit(1)
    }
  }

  console.log('✅ SPA route files generated successfully')
}

generateSPARoutes().catch((error) => {
  console.error('❌ Error generating SPA routes:', error)
  process.exit(1)
})
