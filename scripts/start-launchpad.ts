import { spawn } from 'bun'

console.log('🚀 初始化 Gravito Launchpad 全系統...')

// 1. 啟動後端 (Mission Control)
const backend = spawn(['bun', 'server.ts'], {
  cwd: 'packages/launchpad',
  stdout: 'pipe',
  stderr: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' }, // 保持顏色輸出
})

console.log('✅ 後端服務啟動中...')

// 2. 啟動前端 (Dashboard)
const frontend = spawn(['bun', 'dev'], {
  cwd: 'packages/launchpad-dashboard',
  stdout: 'pipe',
  stderr: 'pipe',
  env: { ...process.env, FORCE_COLOR: '1' },
})

console.log('✅ 前端儀表板啟動中...')

// 3. 日誌整合器
const pipeLog = (stream: ReadableStream, prefix: string, color: string) => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  const read = async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      const text = decoder.decode(value)
      // 簡單的行處理，加上前綴
      text.split('\n').forEach((line) => {
        if (line.trim()) {
          console.log(`${color}[${prefix}] \x1b[0m${line}`)
        }
      })
    }
  }
  read()
}

// 綠色前綴給後端，藍色前綴給前端
pipeLog(backend.stdout, 'SERVER', '\x1b[32m')
pipeLog(backend.stderr, 'SERVER', '\x1b[32m') // 通常 stderr 也是重要訊息
pipeLog(frontend.stdout, 'CLIENT', '\x1b[36m')
pipeLog(frontend.stderr, 'CLIENT', '\x1b[36m')

console.log('✨ 系統全線運作中！按 Ctrl+C 停止.\n')

// 4. 優雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉所有服務...')
  backend.kill()
  frontend.kill()
  process.exit(0)
})
