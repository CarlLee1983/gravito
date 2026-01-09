import { describe, expect, it } from 'bun:test'
import { isHttpAdapter } from '../src/adapters/types'

const makeAdapter = () => ({
  name: 'test',
  version: '1.0.0',
  native: {},
  route: () => undefined,
  routes: () => undefined,
  use: () => undefined,
  useGlobal: () => undefined,
  mount: () => undefined,
  onError: () => undefined,
  onNotFound: () => undefined,
  fetch: () => new Response('ok'),
  createContext: () => ({}) as unknown,
})

describe('adapters/types', () => {
  it('detects valid adapters', () => {
    expect(isHttpAdapter(makeAdapter())).toBe(true)
  })

  it('rejects invalid adapters', () => {
    expect(isHttpAdapter(null)).toBe(false)
    expect(isHttpAdapter({})).toBe(false)
    expect(isHttpAdapter({ name: 'x', fetch: 'nope', route: () => undefined })).toBe(false)
  })
})
