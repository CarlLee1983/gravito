import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

function findExportsWithoutDocs(dir: string): void {
  const files = readdirSync(dir)

  for (const file of files) {
    const fullPath = join(dir, file)

    if (statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        findExportsWithoutDocs(fullPath)
      }
      continue
    }

    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.endsWith('.bench.ts'))
      continue

    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Match exported declarations at the start of the line
      if (/^export (class|function|interface|type|const|abstract class)/.test(line)) {
        // Check if previous line has JSDoc
        const prevLine = i > 0 ? lines[i - 1].trim() : ''

        if (!prevLine.endsWith('*/')) {
          const match = line.match(/export (?:abstract )?\w+ (\w+)/)
          if (match) {
            console.log(`${fullPath}:${i + 1} - Missing docs for: ${match[1]}`)
          }
        }
      }
    }
  }
}

console.log('Scanning for missing JSDoc...')
findExportsWithoutDocs('packages')
