#!/usr/bin/env bun

/**
 * CI 優化效果本地測試腳本
 *
 * 此腳本用於本地驗證 CI 優化（增量 build、並發度提升）的效果
 *
 * 使用方式：
 * bun run scripts/test-ci-optimization.ts [--base <ref>] [--concurrency <num>]
 *
 * 選項：
 * --base: 比較的基準 ref（默認 origin/main）
 * --concurrency: 測試的並發度（默認 4）
 * --verbose: 顯示詳細輸出
 *
 * 範例：
 * # 測試與 main 相比的增量 build
 * bun run scripts/test-ci-optimization.ts --base origin/main
 *
 * # 測試不同並發度的 typecheck 效能
 * bun run scripts/test-ci-optimization.ts --concurrency 6
 */

import { parseArgs } from 'node:util'
import { $ } from 'bun'

interface TestResult {
  name: string
  startTime: number
  endTime: number
  duration: number
  success: boolean
  output: string
}

const args = parseArgs({
  options: {
    base: { type: 'string', default: 'origin/main' },
    concurrency: { type: 'string', default: '4' },
    verbose: { type: 'boolean', default: false },
  },
})

const BASE_REF = args.values.base
const CONCURRENCY = Math.max(1, Number.parseInt(args.values.concurrency, 10) || 4)
const VERBOSE = args.values.verbose

/**
 * 執行測試並記錄時間
 */
async function runTest(name: string, command: string): Promise<TestResult> {
  const startTime = Date.now()
  try {
    const { stdout, stderr } = VERBOSE
      ? await $`bash -c "${command}"`
      : await $`bash -c "${command}"`.quiet()
    const output = stdout.toString() + stderr.toString()
    const endTime = Date.now()
    return {
      name,
      startTime,
      endTime,
      duration: (endTime - startTime) / 1000,
      success: true,
      output,
    }
  } catch (e: any) {
    const endTime = Date.now()
    const output = e.stdout?.toString() || e.stderr?.toString() || ''
    return {
      name,
      startTime,
      endTime,
      duration: (endTime - startTime) / 1000,
      success: false,
      output,
    }
  }
}

/**
 * 格式化時間（秒）
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round((seconds % 60) * 100) / 100
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 CI 優化效果測試\n')
  console.log(`基準 ref: ${BASE_REF}`)
  console.log(`並發度: ${CONCURRENCY}\n`)

  const results: TestResult[] = []

  // 1. 取得受影響的包
  console.log('1️⃣  偵測受影響的包...')
  const affectedResult = await runTest(
    'Get Affected Packages',
    `bun run scripts/get-affected-packages.ts --base "${BASE_REF}"`
  )
  results.push(affectedResult)

  if (!affectedResult.success) {
    console.error('❌ 無法取得受影響的包')
    console.error(affectedResult.output)
    process.exit(1)
  }

  const filters = affectedResult.output.trim()
  const packageCount = filters
    ? filters.split(' ').filter((f) => f.startsWith('--filter')).length
    : 0

  if (packageCount === 0) {
    console.log('⚠️  沒有檢測到變更的包')
    console.log('✅ 增量 build 測試跳過（因為沒有變更）\n')
  } else {
    console.log(`✅ 檢測到 ${packageCount} 個受影響的包\n`)

    // 2. 增量 build 測試
    if (filters) {
      console.log('2️⃣  測試增量 build...')
      const buildResult = await runTest(
        'Incremental Build',
        `bunx turbo run build ${filters} --no-cache`
      )
      results.push(buildResult)

      if (buildResult.success) {
        console.log(`✅ 增量 build 成功（耗時：${formatTime(buildResult.duration)}）\n`)
      } else {
        console.log(`❌ 增量 build 失敗\n`)
      }
    }
  }

  // 3. Typecheck 並發度測試
  console.log(`3️⃣  測試 typecheck 並發度 (${CONCURRENCY})...`)
  const typecheckResult = await runTest(
    `Typecheck (Concurrency ${CONCURRENCY})`,
    `bunx turbo run typecheck --filter='./packages/*' --concurrency=${CONCURRENCY} --no-cache`
  )
  results.push(typecheckResult)

  if (typecheckResult.success) {
    console.log(`✅ Typecheck 成功（耗時：${formatTime(typecheckResult.duration)}）\n`)
  } else {
    console.log(`⚠️  Typecheck 有失敗（耗時：${formatTime(typecheckResult.duration)}）\n`)
  }

  // 4. Test 並發度測試
  console.log(`4️⃣  測試 test 並發度 (${CONCURRENCY})...`)
  const testResult = await runTest(
    `Test (Concurrency ${CONCURRENCY})`,
    `bunx turbo run test:coverage --filter='./packages/*' --concurrency=${CONCURRENCY} --no-cache --continue`
  )
  results.push(testResult)

  if (testResult.success) {
    console.log(`✅ Test 成功（耗時：${formatTime(testResult.duration)}）\n`)
  } else {
    console.log(`⚠️  Test 有失敗（耗時：${formatTime(testResult.duration)}）\n`)
  }

  // 5. Lint 測試（增量）
  console.log('5️⃣  測試增量 lint...')
  const lintPaths = affectedResult.output.trim()
    ? (
        await runTest(
          'Get Lint Paths',
          `bun run scripts/get-affected-packages.ts --base "${BASE_REF}" --mode lint --output-paths`
        )
      ).output.trim()
    : ''

  if (lintPaths) {
    const lintResult = await runTest(
      'Incremental Lint',
      `bunx biome check ${lintPaths} --diagnostic-level=error`
    )
    results.push(lintResult)

    if (lintResult.success) {
      console.log(`✅ 增量 lint 成功（耗時：${formatTime(lintResult.duration)}）\n`)
    } else {
      console.log(`⚠️  Lint 有警告/錯誤（耗時：${formatTime(lintResult.duration)}）\n`)
    }
  } else {
    console.log('⚠️  沒有需要檢查的檔案\n')
  }

  // 輸出摘要
  console.log('📊 測試摘要：\n')
  console.log('| 測試項目 | 耗時 | 狀態 |')
  console.log('|---------|------|------|')

  let totalDuration = 0
  for (const result of results) {
    const status = result.success ? '✅' : '⚠️'
    console.log(`| ${result.name} | ${formatTime(result.duration)} | ${status} |`)
    totalDuration += result.duration
  }

  console.log('|---------|------|------|')
  console.log(`| **總耗時** | **${formatTime(totalDuration)}** | - |`)
  console.log()

  // 建議
  console.log('💡 建議：')
  console.log(`- 增量 build 應該顯著快於全量 build（目標 60-80% 節省）`)
  console.log(`- Typecheck 並發度 ${CONCURRENCY} 應該提升效能 30-50%`)
  console.log(`- Test 並發度 ${CONCURRENCY} 應該提升效能 20-40%（受資料庫連接限制）`)
  console.log(`- Lint 增量檢查應該節省 80% 時間\n`)

  // 系統資源提示
  console.log('📈 資源監控：')
  try {
    const { stdout: memInfo } = await $`free -h`.quiet()
    const { stdout: diskInfo } = await $`df -h /`.quiet()
    console.log(`記憶體：${memInfo.toString().split('\n')[1].trim()}`)
    console.log(`磁碟：${diskInfo.toString().split('\n')[1].trim()}`)
  } catch (_e) {
    console.log('（資源監控不可用）')
  }

  const failedCount = results.filter((r) => !r.success).length
  process.exit(failedCount > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('❌ 錯誤：', e)
  process.exit(1)
})
