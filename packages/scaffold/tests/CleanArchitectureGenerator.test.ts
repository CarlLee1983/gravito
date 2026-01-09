import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { BaseGenerator } from '../src/generators/BaseGenerator'
import { CleanArchitectureGenerator } from '../src/generators/CleanArchitectureGenerator'

describe('CleanArchitectureGenerator', () => {
  const config = {
    templatesDir: path.resolve(__dirname, '../templates'),
  }
  const generator = new CleanArchitectureGenerator(config)

  const context = BaseGenerator.createContext('TestApp', '/tmp/test-app', 'clean', 'bun')

  it('should generate directory structure with enterprise imports', () => {
    const structure = generator.getDirectoryStructure(context)

    // Helper to find file content
    const findFile = (nodes: any[], name: string): string | undefined => {
      for (const node of nodes) {
        if (node.type === 'file' && node.name === name) {
          return node.content
        }
        if (node.children) {
          const found = findFile(node.children, name)
          if (found) {
            return found
          }
        }
      }
      return undefined
    }

    // Check User Entity
    const userEntity = findFile(structure, 'User.ts')
    expect(userEntity).toBeDefined()
    expect(userEntity).toContain("import { Entity } from '@gravito/enterprise'")

    // Check Email ValueObject
    const emailVO = findFile(structure, 'Email.ts')
    expect(emailVO).toBeDefined()
    expect(emailVO).toContain("import { ValueObject } from '@gravito/enterprise'")

    // Check Repository Interface
    const userRepo = findFile(structure, 'IUserRepository.ts')
    expect(userRepo).toBeDefined()
    expect(userRepo).toContain("import type { Repository } from '@gravito/enterprise'")
    expect(userRepo).toContain('extends Repository<User, string>')

    // Check UseCase
    const createUser = findFile(structure, 'CreateUser.ts')
    expect(createUser).toBeDefined()
    expect(createUser).toContain("import { UseCase } from '@gravito/enterprise'")
    expect(createUser).toContain('extends UseCase<CreateUserInput, CreateUserOutput>')
  })

  it('should generate docker files and scripts', async () => {
    // We need to use internal methods to check common files generation
    // since getDirectoryStructure only returns architecture-specific files
    const pkgJson = (generator as any).generatePackageJson(context)
    expect(pkgJson).toContain('"docker:build": "docker build -t test-app ."')
    expect(pkgJson).toContain('"docker:run": "docker run -it -p 3000:3000 test-app"')

    const dockerfile = (generator as any).generateDockerfile(context)
    expect(dockerfile).toContain('FROM oven/bun:1.0 AS base')
    expect(dockerfile).toContain('RUN bun run build')
    expect(dockerfile).toContain('ENTRYPOINT [ "bun", "run", "index.js" ]')

    const dockerignore = (generator as any).generateDockerIgnore()
    expect(dockerignore).toContain('node_modules')
    expect(dockerignore).toContain('dist')
  })
})
