import fs from 'node:fs/promises'
import path from 'node:path'

export interface GeneratorOptions {
  [key: string]: any
}

/**
 * GeneratorBase - 代碼生成器基類
 * 
 * 感知項目架構並根據架構生成對應的代碼文件
 */
export abstract class GeneratorBase {
  protected projectDir = process.cwd()
  protected architecture: 'mvc' | 'ddd' | 'cqrs' = 'mvc'

  constructor() {
    this.detectArchitecture()
  }

  /**
   * 從 package.json 中檢測項目架構
   */
  private async detectArchitecture() {
    try {
      const pkgPath = path.join(this.projectDir, 'package.json')
      const content = await fs.readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(content)
      this.architecture = pkg.gravito?.architecture || 'mvc'
    } catch {
      this.architecture = 'mvc'
    }
  }

  /**
   * 根據架構返回目標目錄
   */
  protected getTargetDir(type: string): string {
    const baseMapping: Record<string, Record<'mvc' | 'ddd' | 'cqrs', string>> = {
      controller: {
        mvc: 'src/Http/Controllers',
        ddd: 'src/Presentation/Http/Controllers',
        cqrs: 'src/Presentation/Controllers',
      },
      model: {
        mvc: 'src/Models',
        ddd: 'src/Domain',
        cqrs: 'src/Infrastructure/Persistence',
      },
      command: {
        mvc: 'src/Commands',
        ddd: 'src/Application/Commands',
        cqrs: 'src/Application/Commands',
      },
      query: {
        mvc: 'src/Queries',
        ddd: 'src/Application/Queries',
        cqrs: 'src/Application/Queries',
      },
      middleware: {
        mvc: 'src/Http/Middleware',
        ddd: 'src/Presentation/Http/Middleware',
        cqrs: 'src/Presentation/Middleware',
      },
      service: {
        mvc: 'src/Services',
        ddd: 'src/Application/Services',
        cqrs: 'src/Application/Services',
      },
    }

    return baseMapping[type]?.[this.architecture] || `src/${type}s`
  }

  /**
   * 生成文件
   */
  protected async generateFile(
    relativeDir: string,
    filename: string,
    content: string
  ): Promise<string> {
    const targetDir = path.join(this.projectDir, relativeDir)
    await fs.mkdir(targetDir, { recursive: true })
    
    const filePath = path.join(targetDir, filename)
    await fs.writeFile(filePath, content)
    
    return filePath
  }

  /**
   * 抽象方法：子類必須實現
   */
  abstract run(name: string, options: GeneratorOptions): Promise<void>
}
