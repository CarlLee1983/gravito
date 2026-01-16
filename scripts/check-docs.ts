import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

function findExportsWithoutDocs(dir: string): void {
  const files = readdirSync(dir)

  for (const file of files) {
    const fullPath = join(dir, file)

    if (statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        findExportsWithoutDocs(fullPath)
      }
      continue
    }

    if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('.d.ts')) continue

    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (/^export (class|function|interface|type|const) /.test(line)) {
        // Check if previous line has JSDoc
        // Iterate backwards skipping empty lines/imports to find if comment exists
        let prevIndex = i - 1
        let hasDoc = false

        while (prevIndex >= 0) {
          const l = lines[prevIndex].trim()
          if (l === '' || l.startsWith('@')) {
            // skip decorators or empty
            prevIndex--
            continue
          }
          if (l.endsWith('*/')) {
            hasDoc = true
          }
          break
        }

        // Also check simplified JSDoc single line /** ... */

        if (!hasDoc) {
          // Double check if line itself has doc? No, standard is block above.
          const match = line.match(/export (class|function|interface|type|const) (\w+)/)
          if (match) {
            // Ignore some common auto-generated patterns or index files if they just re-export
            // But this regex catches declarations.
            console.log(`${fullPath}:${i + 1} - Missing docs for: ${match[1]} ${match[2]}`)
          }
        }
      }
    }
  }
}

console.log('Scanning for missing JSDoc...')
findExportsWithoutDocs('packages')
