import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const packagesDir = resolve(process.cwd(), 'packages')
const dirs = readdirSync(packagesDir)

let fixed = 0
let skipped = 0
let errors = 0

for (const dir of dirs) {
  const pkgPath = join(packagesDir, dir, 'package.json')

  if (!existsSync(pkgPath)) {
    continue
  }

  const content = readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(content)

  if (!pkg.scripts?.['test:coverage']?.includes('--coverage-threshold')) {
    skipped++
    continue
  }

  // 提取閾值
  const match = pkg.scripts['test:coverage'].match(/--coverage-threshold=(\d+)/)
  if (!match) {
    console.error(`⚠️  ${dir}: Cannot parse threshold`)
    errors++
    continue
  }

  const threshold = match[1]

  // 建立 scripts 目錄
  const scriptsDir = join(packagesDir, dir, 'scripts')
  if (!existsSync(scriptsDir)) {
    mkdirSync(scriptsDir, { recursive: true })
  }

  // 建立 check-coverage.ts
  const checkCoveragePath = join(scriptsDir, 'check-coverage.ts')
  const checkCoverageContent = `import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const lcovPath = process.argv[2] ?? 'coverage/lcov.info'
const threshold = Number.parseFloat(process.env.COVERAGE_THRESHOLD ?? '${threshold}')

const root = resolve(process.cwd())
const srcRoot = \`\${resolve(root, 'src')}/\`

// 檢查 lcov.info 是否存在
if (!existsSync(lcovPath)) {
  console.error(\`Coverage file not found: \${lcovPath}\`)
  process.exit(1)
}

let content: string
try {
  content = readFileSync(lcovPath, 'utf-8')
} catch (error) {
  console.error(\`Failed to read coverage file: \${error}\`)
  process.exit(1)
}

const lines = content.split('\\n')

let currentFile: string | null = null
let total = 0
let hit = 0

for (const line of lines) {
  if (line.startsWith('SF:')) {
    const filePath = line.slice(3).trim()
    const abs = resolve(root, filePath)
    currentFile = abs.startsWith(srcRoot) ? abs : null
    continue
  }

  if (!currentFile) {
    continue
  }

  if (line.startsWith('DA:')) {
    const parts = line.slice(3).split(',')
    if (parts.length >= 2) {
      total += 1
      const count = Number.parseInt(parts[1] ?? '0', 10)
      if (count > 0) {
        hit += 1
      }
    }
  }
}

const percent = total === 0 ? 0 : (hit / total) * 100
const rounded = Math.round(percent * 100) / 100

if (rounded < threshold) {
  console.error(
    \`${dir} coverage \${rounded}% is below threshold \${threshold}%. Covered lines: \${hit}/\${total}.\`
  )
  process.exit(1)
}

console.log(\`${dir} coverage \${rounded}% (\${hit}/\${total}) meets threshold \${threshold}%.\`)
`

  writeFileSync(checkCoveragePath, checkCoverageContent)

  // 更新 package.json
  pkg.scripts['test:coverage'] =
    `bun test --coverage --coverage-reporter=lcov --coverage-dir coverage && bun run --bun scripts/check-coverage.ts`
  pkg.scripts['test:ci'] =
    `bun test --coverage --coverage-reporter=lcov --coverage-dir coverage && bun run --bun scripts/check-coverage.ts`

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  console.log(`✅ Fixed ${dir}`)
  fixed++
}

console.log(`\n📊 Summary:`)
console.log(`✅ Fixed: ${fixed}`)
console.log(`⏭️  Skipped: ${skipped}`)
console.log(`❌ Errors: ${errors}`)
