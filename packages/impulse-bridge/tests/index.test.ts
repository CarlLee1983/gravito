import { describe, expect, it } from 'bun:test'

import { ImpulseBridge, impulseBridgeMiddleware } from '../src/index'

class MockRequest {
  getBlueprint() {
    return {
      fields: {
        email: { type: 'string', required: true },
      },
    }
  }
}

function createContext(overrides: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(overrides))
  return {
    get(key: string) {
      return store.get(key)
    },
    set(key: string, value: unknown) {
      store.set(key, value)
    },
  }
}

describe('ImpulseBridge', () => {
  it('shares blueprints through inertia when available', () => {
    const sharedProps: Record<string, unknown> = {}
    const ctx = createContext({
      inertia: {
        getSharedProps: () => sharedProps,
        share: (key: string, value: unknown) => {
          sharedProps[key] = value
        },
      },
    })

    ImpulseBridge.share(ctx as any, 'register', MockRequest as any)

    expect(sharedProps.blueprints).toEqual({
      register: {
        fields: {
          email: { type: 'string', required: true },
        },
      },
    })
  })

  it('falls back to inertiaShared state', async () => {
    const ctx = createContext()
    const next = async () => new Response('ok')

    const middleware = impulseBridgeMiddleware({ register: MockRequest as any })
    const response = await middleware(ctx as any, next)

    expect(response?.status).toBe(200)
    expect(ctx.get('inertiaShared')).toEqual({
      blueprints: {
        register: {
          fields: {
            email: { type: 'string', required: true },
          },
        },
      },
    })
  })
})
