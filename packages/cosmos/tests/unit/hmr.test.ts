/**
 * @file packages/cosmos/tests/unit/hmr.test.ts
 * @description 測試 HMR (熱重載) 功能
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HMRWatcher } from '../../src/HMRWatcher'

describe('HMRWatcher', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'gravito-hmr-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { force: true, recursive: true })
  })

  it('should detect file changes', async () => {
    const filePath = join(tmpDir, 'zh-TW.json')
    writeFileSync(filePath, JSON.stringify({ test: 'initial' }))

    const changeEvents: Array<{ locale: string; type: string }> = []

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      debounce: 100,
      verbose: false,
    })

    watcher.onChange((event) => {
      changeEvents.push({
        locale: event.locale,
        type: event.type,
      })
    })

    watcher.start()

    // 等待監視器啟動
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 修改檔案
    await writeFile(filePath, JSON.stringify({ test: 'updated' }))

    // 等待防抖和事件處理
    await new Promise((resolve) => setTimeout(resolve, 500))

    watcher.stop()

    expect(changeEvents.length).toBeGreaterThan(0)
    expect(changeEvents[0].locale).toBe('zh-TW')
  })

  it('should not watch when disabled', async () => {
    const watcher = new HMRWatcher({
      enabled: false,
      watchDirs: [tmpDir],
    })

    watcher.start()
    expect(watcher.isActive()).toBe(false)
  })

  it('should filter by file extension', async () => {
    const jsonFile = join(tmpDir, 'en.json')
    const txtFile = join(tmpDir, 'en.txt')

    writeFileSync(jsonFile, '{}')
    writeFileSync(txtFile, 'text')

    const changeEvents: string[] = []

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      extensions: ['.json'],
      debounce: 100,
      verbose: false,
    })

    watcher.onChange((event) => {
      changeEvents.push(event.filePath)
    })

    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 修改 JSON 檔案 (應該被檢測到)
    await writeFile(jsonFile, '{"updated": true}')
    await new Promise((resolve) => setTimeout(resolve, 300))

    // 修改 TXT 檔案 (應該被忽略)
    await writeFile(txtFile, 'updated text')
    await new Promise((resolve) => setTimeout(resolve, 300))

    watcher.stop()

    // 只有 JSON 檔案的變更應該被檢測到
    expect(changeEvents.some((path) => path.includes('.json'))).toBe(true)
    expect(changeEvents.some((path) => path.includes('.txt'))).toBe(false)
  })

  it('should support multiple listeners', async () => {
    const filePath = join(tmpDir, 'test.json')
    writeFileSync(filePath, '{}')

    let listener1Called = false
    let listener2Called = false

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      debounce: 100,
      verbose: false,
    })

    watcher.onChange(() => {
      listener1Called = true
    })

    watcher.onChange(() => {
      listener2Called = true
    })

    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    await writeFile(filePath, '{"updated": true}')
    await new Promise((resolve) => setTimeout(resolve, 300))

    watcher.stop()

    expect(listener1Called).toBe(true)
    expect(listener2Called).toBe(true)
  })

  it('should allow removing listeners', async () => {
    const filePath = join(tmpDir, 'test.json')
    writeFileSync(filePath, '{}')

    let callCount = 0
    const listener = () => {
      callCount++
    }

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      debounce: 100,
      verbose: false,
    })

    watcher.onChange(listener)
    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 第一次變更
    await writeFile(filePath, '{"v": 1}')
    await new Promise((resolve) => setTimeout(resolve, 300))

    const initialCallCount = callCount
    expect(initialCallCount).toBeGreaterThan(0)

    // 移除監聽器
    watcher.removeListener(listener)

    // 第二次變更 (不應該觸發)
    await writeFile(filePath, '{"v": 2}')
    await new Promise((resolve) => setTimeout(resolve, 300))

    watcher.stop()

    // 移除後,callCount 應該不再增加
    expect(callCount).toBe(initialCallCount)
  })

  it('should debounce rapid changes', async () => {
    const filePath = join(tmpDir, 'rapid.json')
    writeFileSync(filePath, '{}')

    let callCount = 0

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      debounce: 200,
      verbose: false,
    })

    watcher.onChange(() => {
      callCount++
    })

    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 快速連續修改多次
    await writeFile(filePath, '{"v": 1}')
    await new Promise((resolve) => setTimeout(resolve, 50))
    await writeFile(filePath, '{"v": 2}')
    await new Promise((resolve) => setTimeout(resolve, 50))
    await writeFile(filePath, '{"v": 3}')

    // 等待防抖完成
    await new Promise((resolve) => setTimeout(resolve, 400))

    watcher.stop()

    // 由於防抖,應該只觸發一次或少數幾次,而不是每次修改都觸發
    expect(callCount).toBeLessThan(3)
  })

  it('should handle errors in listeners gracefully', async () => {
    const filePath = join(tmpDir, 'error-test.json')
    writeFileSync(filePath, '{}')

    const errorListener = () => {
      throw new Error('Listener error')
    }

    let goodListenerCalled = false
    const goodListener = () => {
      goodListenerCalled = true
    }

    const watcher = new HMRWatcher({
      enabled: true,
      watchDirs: [tmpDir],
      debounce: 100,
      verbose: false,
    })

    // 註冊會拋出錯誤的監聽器和正常的監聽器
    watcher.onChange(errorListener)
    watcher.onChange(goodListener)

    watcher.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    await writeFile(filePath, '{"updated": true}')
    await new Promise((resolve) => setTimeout(resolve, 300))

    watcher.stop()

    // 即使有監聽器出錯,其他監聽器仍應該被呼叫
    expect(goodListenerCalled).toBe(true)
  })
})
