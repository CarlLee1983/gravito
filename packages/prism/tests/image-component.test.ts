import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'

mock.module('react', () => ({}))
mock.module('react/jsx-runtime', () => ({
  jsx: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
  jsxs: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
  Fragment: 'fragment',
}))
mock.module('react/jsx-dev-runtime', () => ({
  jsxDEV: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
  Fragment: 'fragment',
}))

let Image: typeof import('../src/components/Image').Image

beforeAll(async () => {
  ;({ Image } = await import('../src/components/Image'))
})

afterAll(() => {
  mock.restore()
})

describe('Image component', () => {
  it('renders image HTML via ImageService', () => {
    const element = Image({
      src: '/static/hero.jpg',
      alt: 'Hero',
      className: 'hero',
    } as any)

    expect(element.type).toBe('img')
    expect(element.props.src).toBe('/static/hero.jpg')
    expect(element.props.className).toBe('hero')
    expect(element.props.alt).toBe('Hero')
  })
})
