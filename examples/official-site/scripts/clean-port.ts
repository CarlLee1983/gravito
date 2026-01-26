#!/usr/bin/env bun
/**
 * 清理指定埠的進程
 * 用法: bun scripts/clean-port.ts <port>
 */

const port = process.argv[2] || '5174'
const currentPid = process.pid
const parentPid = process.ppid

try {
  // 查找佔用埠的進程
  const proc = Bun.spawn(['lsof', '-ti', `:${port}`], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const output = await new Response(proc.stdout).text()
  const pids = output.trim().split('\n').filter(Boolean)

  if (pids.length === 0) {
    console.log(`✓ Port ${port} is free`)
    process.exit(0)
  }

  // 終止所有佔用埠的進程（排除當前進程和父進程）
  let killed = 0
  for (const pid of pids) {
    if (pid) {
      const pidNum = parseInt(pid, 10)
      // 排除當前進程和父進程（避免殺掉自己）
      if (pidNum === currentPid || pidNum === parentPid) {
        continue
      }
      try {
        Bun.spawnSync(['kill', '-9', pid])
        console.log(`✓ Killed process ${pid} on port ${port}`)
        killed++
      } catch (e) {
        console.warn(`⚠ Failed to kill process ${pid}:`, e)
      }
    }
  }

  if (killed > 0) {
    console.log(`✓ Port ${port} is now free`)
  } else {
    console.log(`✓ Port ${port} is free (no processes to kill)`)
  }
} catch (e: any) {
  // lsof 返回非零退出碼表示沒有進程佔用埠
  if (e.code === 1 || e.exitCode === 1) {
    console.log(`✓ Port ${port} is free`)
    process.exit(0)
  }
  console.error(`✗ Error cleaning port ${port}:`, e.message)
  process.exit(1)
}
