import fs from 'node:fs/promises'
import path from 'node:path'
import type { FileMerger } from '../FileMerger'
import { StubGenerator, type StubVariables } from '../generators/StubGenerator'
import { FileUtilities } from './FileUtilities'

export class TemplateManager {
  private stubGenerator: StubGenerator

  constructor(templatesDir: string) {
    this.stubGenerator = new StubGenerator({
      stubsDir: templatesDir,
      outputDir: '',
    })
  }

  render(template: string, context: Record<string, unknown>): string {
    return this.stubGenerator.render(template, context as unknown as StubVariables)
  }

  async applyOverlay(
    sourceDir: string,
    targetDir: string,
    context: Record<string, unknown>,
    fileMerger: FileMerger,
    log?: (msg: string) => void
  ): Promise<string[]> {
    const createdFiles: string[] = []
    try {
      await fs.access(sourceDir)
    } catch {
      return []
    }

    const files = await FileUtilities.walk(sourceDir)
    for (const filePath of files) {
      const relativePath = path.relative(sourceDir, filePath)
      let content = await fs.readFile(filePath, 'utf-8')
      try {
        content = this.render(content, context)
      } catch {
        // ignore
      }

      const fullPath = await FileUtilities.writeFile(
        targetDir,
        relativePath,
        content,
        fileMerger,
        log
      )
      createdFiles.push(fullPath)
    }
    return createdFiles
  }
}
