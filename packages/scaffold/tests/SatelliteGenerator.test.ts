import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { BaseGenerator } from '../src/generators/BaseGenerator'
import { SatelliteGenerator } from '../src/generators/SatelliteGenerator'

describe('SatelliteGenerator', () => {
  const config = {
    templatesDir: path.resolve(__dirname, '../templates'),
  }
  const generator = new SatelliteGenerator(config)

  it('應該能正確產生官方內部插件結構 (Internal)', async () => {
    const context = BaseGenerator.createContext(
      'Membership',
      '/tmp/membership',
      'satellite',
      'bun',
      {
        isInternal: true,
      }
    )

    const structure = generator.getDirectoryStructure(context)
    const pkgJson = (generator as any).generatePackageJson(context)

    // 驗證套件名稱
    expect(pkgJson).toContain('@gravito/satellite-membership')
    // 驗證 workspace 依賴 (Dogfooding)
    expect(pkgJson).toContain('"@gravito/enterprise": "workspace:*"')
    expect(pkgJson).toContain('"@gravito/atlas": "workspace:*"')

    // 驗證目錄結構
    const findDir = (nodes: any[], name: string) => nodes.find((n) => n.name === name)
    const src = findDir(structure, 'src')
    expect(findDir(src.children, 'Domain')).toBeDefined()
    expect(findDir(src.children, 'Infrastructure')).toBeDefined()
    expect(findDir(src.children, 'manifest.json')).toBeDefined()
  })

  it('應該能正確產生社群外部插件結構 (External)', async () => {
    const context = BaseGenerator.createContext(
      'AwesomePlugin',
      '/tmp/external',
      'satellite',
      'bun',
      {
        isInternal: false,
      }
    )

    const pkgJson = (generator as any).generatePackageJson(context)

    // 驗證套件名稱
    expect(pkgJson).toContain('gravito-satellite-awesome-plugin')
    // 驗證 NPM 版本依賴
    expect(pkgJson).toContain('"@gravito/enterprise": "^1.0.0-beta.1"')
  })
})
