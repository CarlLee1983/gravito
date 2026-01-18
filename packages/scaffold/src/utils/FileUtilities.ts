import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileMerger } from '../FileMerger'

export class FileUtilities {
  static async walk(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir)
    const paths: string[] = []
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        paths.push(...(await FileUtilities.walk(filePath)))
      } else {
        paths.push(filePath)
      }
    }
    return paths
  }

  static async writeFile(
    basePath: string,
    relativePath: string,
    content: string,
    fileMerger: FileMerger,
    log?: (message: string) => void
  ): Promise<string> {
    const fullPath = path.resolve(basePath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    let finalContent = content

    // Check if file exists (merge if so)
    try {
      const existingContent = await fs.readFile(fullPath, 'utf-8')
      finalContent = fileMerger.merge(relativePath, existingContent, content)
      if (finalContent !== content) {
        log?.(`🔄 Merged file: ${relativePath}`)
      }
    } catch {
      // File doesn't exist, just write
    }

    await fs.writeFile(fullPath, finalContent, 'utf-8')
    log?.(`📄 Created file: ${relativePath}`)
    return fullPath
  }
}
