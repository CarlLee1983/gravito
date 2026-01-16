#!/usr/bin/env bun

/**
 * 清理佔用端口的進程
 * 手動執行：bun run scripts/clean-ports.ts
 * 或在啟動前執行：bun run dev:clean
 */

const ports = [5173, 3001]

for (const port of ports) {
  try {
    const { execSync } = await import('node:child_process')
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: 'pipe' })
    const pids = result.trim().split('\n').filter(Boolean)

    if (pids.length > 0) {
      console.log(`🔍 發現端口 ${port} 被以下進程佔用: ${pids.join(', ')}`)
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' })
          console.log(`✅ 已終止進程 ${pid}`)
        } catch (e) {
          console.warn(`⚠️  無法終止進程 ${pid}: ${e}`)
        }
      }
    }
  } catch (_e) {
    // 端口未被佔用，忽略錯誤
  }
}

console.log('✨ 端口清理完成')
