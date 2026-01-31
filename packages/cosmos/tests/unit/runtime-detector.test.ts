/**
 * @file packages/cosmos/tests/unit/runtime-detector.test.ts
 * @description Runtime detector 單元測試
 */

import { describe, expect, it } from 'bun:test'
import { detectRuntime, isEdge, isNode } from '../../src/runtime/detector'

describe('Runtime Detector', () => {
  it('should detect node runtime', () => {
    const runtime = detectRuntime()
    // Bun 環境會被檢測為 node-compatible
    expect(runtime).toBe('node')
  })

  it('should return true for isNode()', () => {
    expect(isNode()).toBe(true)
  })

  it('should return false for isEdge()', () => {
    expect(isEdge()).toBe(false)
  })

  // 以下測試模擬 Edge 環境 (需要 mock globalThis)
  it('should detect Cloudflare Workers', () => {
    const originalCaches = globalThis.caches
    const originalWSP = (globalThis as any).WebSocketPair

    // Mock Cloudflare Workers 環境
    ;(globalThis as any).caches = {}
    ;(globalThis as any).WebSocketPair = class {}

    const runtime = detectRuntime()

    // Restore
    if (originalCaches) {
      globalThis.caches = originalCaches
    } else {
      delete (globalThis as any).caches
    }

    if (originalWSP) {
      ;(globalThis as any).WebSocketPair = originalWSP
    } else {
      delete (globalThis as any).WebSocketPair
    }

    expect(runtime).toBe('edge')
  })

  it('should detect Vercel Edge Runtime', () => {
    const originalEdgeRuntime = (globalThis as any).EdgeRuntime

    // Mock Vercel Edge Runtime 環境
    ;(globalThis as any).EdgeRuntime = 'vercel'

    const runtime = detectRuntime()

    // Restore
    if (originalEdgeRuntime !== undefined) {
      ;(globalThis as any).EdgeRuntime = originalEdgeRuntime
    } else {
      delete (globalThis as any).EdgeRuntime
    }

    expect(runtime).toBe('edge')
  })

  it('should detect Deno', () => {
    const originalDeno = (globalThis as any).Deno

    // Mock Deno 環境
    ;(globalThis as any).Deno = { version: { deno: '1.0.0' } }

    const runtime = detectRuntime()

    // Restore
    if (originalDeno !== undefined) {
      ;(globalThis as any).Deno = originalDeno
    } else {
      delete (globalThis as any).Deno
    }

    expect(runtime).toBe('edge')
  })
})
