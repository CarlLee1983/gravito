import { describe, expect, it } from 'bun:test'
import { HTTPException } from 'hono/http-exception'
import {
  Arr,
  abort,
  abortIf,
  abortUnless,
  app,
  blank,
  config,
  DumpDieError,
  dataGet,
  dataSet,
  dd,
  dump,
  env,
  fail,
  filled,
  hasApp,
  logger,
  ok,
  PlanetCore,
  router,
  Str,
  setApp,
  tap,
  throwIf,
  throwUnless,
  value,
} from '../src/index'

describe('helpers', () => {
  it('app helpers bind and expose the current app', () => {
    setApp(null)
    expect(hasApp()).toBe(false)
    expect(() => app()).toThrow()
    expect(() => config('X', 'fallback')).toThrow()

    const core = new PlanetCore({ config: { HELPER_TEST: 'ok' } })
    setApp(core)

    expect(hasApp()).toBe(true)
    expect(app()).toBe(core)
    expect(logger()).toBe(core.logger)
    expect(router()).toBe(core.router)

    core.config.set('X', 123)
    expect(config<string>('HELPER_TEST')).toBe('ok')
    expect(config<number>('X')).toBe(123)
    expect(config('MISSING', 'fallback')).toBe('fallback')

    setApp(null)
  })

  it('tap returns original value and runs callback', () => {
    const calls: unknown[] = []
    const out = tap({ a: 1 }, (v) => {
      calls.push(v)
    })

    expect(out).toEqual({ a: 1 })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ a: 1 })
  })

  it('value returns literal or evaluates factory', () => {
    expect(value(123)).toBe(123)
    expect(value(() => 456)).toBe(456)
    expect(value((a: number, b: number) => a + b, 1, 2)).toBe(3)
  })

  it('Arr helpers support get/has/set and common utilities', () => {
    const target: Record<string, unknown> = {}
    Arr.set(target, 'a.b.0', 'x')
    expect(target).toEqual({ a: { b: ['x'] } })
    expect(Arr.has(target, 'a.b.0')).toBe(true)
    expect(Arr.get(target, 'a.b.0')).toBe('x')
    expect(Arr.get(target, 'a.b.1', 'fallback')).toBe('fallback')

    expect(Arr.wrap(null)).toEqual([])
    expect(Arr.wrap(1)).toEqual([1])
    expect(Arr.wrap([1, 2])).toEqual([1, 2])

    expect(Arr.first([1, 2, 3])).toBe(1)
    expect(Arr.first([1, 2, 3], (v) => v > 1)).toBe(2)
    expect(Arr.last([1, 2, 3])).toBe(3)
    expect(Arr.last([1, 2, 3], (v) => v < 3)).toBe(2)

    expect(Arr.only({ a: 1, b: 2 }, ['b'])).toEqual({ b: 2 })
    expect(Arr.except({ a: 1, b: 2 }, ['b'])).toEqual({ a: 1 })

    expect(Arr.flatten([1, [2, [3]]])).toEqual([1, 2, 3])

    const users = [
      { id: 1, profile: { name: 'A' } },
      { id: 2, profile: { name: 'B' } },
    ]
    expect(Arr.pluck(users, 'profile.name')).toEqual(['A', 'B'])
    expect(Arr.pluck(users, 'profile.name', 'id')).toEqual({ 1: 'A', 2: 'B' })
  })

  it('Str helpers cover casing, checks, slug, uuid, and random', () => {
    expect(Str.snake('helloWorld')).toBe('hello_world')
    expect(Str.kebab('HelloWorld')).toBe('hello-world')
    expect(Str.studly('hello_world')).toBe('HelloWorld')
    expect(Str.camel('hello_world')).toBe('helloWorld')
    expect(Str.title('hello_world')).toBe('Hello World')

    expect(Str.startsWith('abc', ['a', 'z'])).toBe(true)
    expect(Str.endsWith('abc', 'c')).toBe(true)
    expect(Str.contains('abc', 'b')).toBe(true)

    expect(Str.limit('abcdef', 3)).toBe('abc...')
    expect(Str.slug('Hello, Wörld!')).toBe('hello-world')

    const id = Str.uuid()
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)

    const rnd = Str.random(24)
    expect(rnd).toHaveLength(24)
    expect(rnd).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('response helpers build standardized payloads', () => {
    expect(ok({ a: 1 })).toEqual({ success: true, data: { a: 1 } })
    expect(fail('Bad', 'BAD_CODE', { x: 1 })).toEqual({
      success: false,
      error: { message: 'Bad', code: 'BAD_CODE', details: { x: 1 } },
    })
  })

  it('blank / filled match common Laravel-like semantics', () => {
    expect(blank(null)).toBe(true)
    expect(blank(undefined)).toBe(true)
    expect(blank('')).toBe(true)
    expect(blank('   ')).toBe(true)

    expect(blank('0')).toBe(false)
    expect(blank(0)).toBe(false)
    expect(blank(false)).toBe(false)

    expect(blank([])).toBe(true)
    expect(blank([0])).toBe(false)

    expect(blank({})).toBe(true)
    expect(blank({ a: 1 })).toBe(false)

    expect(blank(new Map())).toBe(true)
    expect(blank(new Map([['a', 1]]))).toBe(false)
    expect(blank(new Set())).toBe(true)
    expect(blank(new Set([1]))).toBe(false)

    expect(blank(new Date())).toBe(false)

    expect(filled('x')).toBe(true)
    expect(filled('   ')).toBe(false)
  })

  it('dataGet reads nested values by dot path and returns default', () => {
    const target = { user: { profile: { name: 'Carl' } }, items: [{ id: 10 }] }

    expect(dataGet(target, 'user.profile.name')).toBe('Carl')
    expect(dataGet(target, 'items.0.id')).toBe(10)
    expect(dataGet(target, 'missing.path', 'fallback')).toBe('fallback')
    expect(dataGet(target, null)).toEqual(target)
  })

  it('dataSet sets nested values, creates containers, and respects overwrite', () => {
    const target: Record<string, unknown> = {}

    dataSet(target, 'user.profile.name', 'Carl')
    expect(target).toEqual({ user: { profile: { name: 'Carl' } } })

    dataSet(target, 'items.0.id', 10)
    expect(target).toEqual({ user: { profile: { name: 'Carl' } }, items: [{ id: 10 }] })

    dataSet(target, 'user.profile.name', 'New', false)
    expect(dataGet(target, 'user.profile.name')).toBe('Carl')
  })

  it('throwIf / throwUnless throw based on condition', () => {
    expect(() => throwIf(false, 'nope')).not.toThrow()
    expect(() => throwIf(true, 'boom')).toThrow('boom')

    expect(() => throwUnless(true, 'nope')).not.toThrow()
    expect(() => throwUnless(false, () => new Error('boom'))).toThrow('boom')
  })

  it('abort helpers throw HTTPException with status', () => {
    try {
      abort(404, 'Not Found')
    } catch (e) {
      expect(e).toBeInstanceOf(HTTPException)
      const err = e as HTTPException
      expect(err.status).toBe(404)
      expect(err.message).toBe('Not Found')
    }

    expect(() => abortIf(false, 401)).not.toThrow()
    expect(() => abortIf(true, 401, 'Unauthorized')).toThrow(HTTPException)

    expect(() => abortUnless(true, 403)).not.toThrow()
    expect(() => abortUnless(false, 403)).toThrow(HTTPException)
  })

  it('dump writes via console.dir and dd throws DumpDieError', () => {
    const original = console.dir
    let calls = 0
    console.dir = () => {
      calls++
    }

    try {
      dump(1, { a: 2 })
      expect(calls).toBe(2)

      expect(() => dd('x')).toThrow(DumpDieError)
    } finally {
      console.dir = original
    }
  })

  it('env reads from Bun.env or process.env with default', () => {
    const key = 'GRAVITO_TEST_ENV_HELPER'
    const original = process.env[key]
    process.env[key] = 'hello'

    try {
      expect(env(key)).toBe('hello')
      delete process.env[key]
      expect(env(key, 'fallback')).toBe('fallback')
    } finally {
      process.env[key] = original
    }
  })
})
