import { describe, expect, test } from 'bun:test'
import { DddGenerator } from '../src/generators/DddGenerator'

describe('DddGenerator', () => {
  const generator = new DddGenerator({
    templatesDir: './stubs',
    outDir: './test-ddd',
  })
  const context = {
    name: 'MyStore',
    nameKebabCase: 'my-store',
    description: 'A DDD store',
    outDir: './test-ddd',
  }

  test('should generate DDD structure using enterprise package', () => {
    const structure = generator.getDirectoryStructure(context as any)

    // Find Shared/Domain/ValueObjects/Id.ts
    const srcDir = structure.find((n) => n.name === 'src')
    const sharedDir = srcDir?.children?.find((n) => n.name === 'Shared')
    const domainDir = sharedDir?.children?.find((n) => n.name === 'Domain')
    const voDir = domainDir?.children?.find((n) => n.name === 'ValueObjects')
    const idFile = voDir?.children?.find((n) => n.name === 'Id.ts')

    expect(idFile).toBeDefined()
    expect(idFile?.content).toContain("import { ValueObject } from '@gravito/enterprise'")

    // Find Modules/Ordering/Domain/Aggregates/Ordering/Ordering.ts
    const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
    const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
    const orderingDomainDir = orderingDir?.children?.find((n) => n.name === 'Domain')
    const aggregatesDir = orderingDomainDir?.children?.find((n) => n.name === 'Aggregates')
    const orderingAggDir = aggregatesDir?.children?.find((n) => n.name === 'Ordering')
    const aggregateFile = orderingAggDir?.children?.find((n) => n.name === 'Ordering.ts')

    expect(aggregateFile).toBeDefined()
    expect(aggregateFile?.content).toContain("import { AggregateRoot } from '@gravito/enterprise'")
    expect(aggregateFile?.content).toContain('extends AggregateRoot<Id>')

    // Check package.json
    const pkgFile = generator.generatePackageJson(context as any)
    expect(pkgFile).toContain('@gravito/enterprise')
  })
})
