import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const lcovPath = process.argv[2] ?? 'coverage/lcov.info'
const threshold = Number.parseFloat(process.env.COVERAGE_THRESHOLD ?? '80')

const root = resolve(process.cwd())
const srcRoot = `${resolve(root, 'src')}/`

const content = readFileSync(lcovPath, 'utf-8')
const lines = content.split('\n')

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
    `Site coverage ${rounded}% is below threshold ${threshold}%.` +
      ` Covered lines: ${hit}/${total}.`
  )
  process.exit(1)
}

console.log(`Site coverage ${rounded}% (${hit}/${total}) meets threshold ${threshold}%.`)
