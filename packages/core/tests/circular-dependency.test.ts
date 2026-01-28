import { describe, expect, it } from 'bun:test'
import { Container } from '../src/Container'
import { CircularDependencyException } from '../src/exceptions/CircularDependencyException'

describe('Container Circular Dependency Detection', () => {
  it('should detect simple circular dependencies (A -> A)', () => {
    const container = new Container()

    container.bind('a', (c) => c.make('a'))

    expect(() => container.make('a')).toThrow(CircularDependencyException)
    expect(() => container.make('a')).toThrow(/Circular dependency detected: a -> a/)
  })

  it('should detect indirect circular dependencies (A -> B -> A)', () => {
    const container = new Container()

    container.bind('a', (c) => c.make('b'))
    container.bind('b', (c) => c.make('a'))

    expect(() => container.make('a')).toThrow(CircularDependencyException)
    expect(() => container.make('a')).toThrow(/Circular dependency detected: a -> b -> a/)
  })

  it('should detect deep circular dependencies (A -> B -> C -> A)', () => {
    const container = new Container()

    container.bind('a', (c) => c.make('b'))
    container.bind('b', (c) => c.make('c'))
    container.bind('c', (c) => c.make('a'))

    expect(() => container.make('a')).toThrow(CircularDependencyException)
    expect(() => container.make('a')).toThrow(/Circular dependency detected: a -> b -> c -> a/)
  })

  it('should not false positive for non-circular multiple resolutions', () => {
    const container = new Container()

    container.bind('common', () => ({ name: 'common' }))
    container.bind('a', (c) => ({ common: c.make('common') }))
    container.bind('b', (c) => ({ common: c.make('common') }))
    container.bind('root', (c) => ({ a: c.make('a'), b: c.make('b') }))

    const root = container.make<any>('root')
    expect(root.a.common.name).toBe('common')
    expect(root.b.common.name).toBe('common')
  })
})
