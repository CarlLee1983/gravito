/**
 * Test helpers for Nova package.
 * Uses real Bun Shell for testing (no mocking of $).
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Create a temporary test file.
 */
export function createTestFile(dir: string, filename: string, content: string): string {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const filepath = resolve(dir, filename)
  writeFileSync(filepath, content, 'utf-8')
  return filepath
}

/**
 * Clean up test directory.
 */
export function cleanupTestDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Create temporary test directory.
 */
export function createTestDir(base: string): string {
  const dir = resolve(base, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
