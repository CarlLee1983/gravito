import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Scaffold } from '../src/Scaffold'

describe('Scaffold', () => {
  it('should resolve default templates directory relative to the package', () => {
    const scaffold = new Scaffold()
    const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

    expect((scaffold as any).templatesDir).toBe(path.resolve(packageDir, 'templates'))
  })
})
