import { describe, expect, it } from 'bun:test'
import { DirtyTracker } from '../src/orm/model/DirtyTracker'

describe('DirtyTracker', () => {
  it('should track changed values', () => {
    const tracker = new DirtyTracker<any>()
    tracker.setOriginal({ name: 'Carl', age: 30 })

    expect(tracker.isDirty()).toBe(false)

    tracker.mark('name', 'Carl')
    expect(tracker.isDirty()).toBe(false)

    tracker.mark('name', 'John')
    expect(tracker.isDirty()).toBe(true)
    expect(tracker.isDirty('name')).toBe(true)
    expect(tracker.isDirty('age')).toBe(false)

    expect(tracker.getDirty()).toContain('name')
    expect(tracker.getDirtyValues({ name: 'John', age: 30 })).toEqual({ name: 'John' })
  })

  it('should sync values', () => {
    const tracker = new DirtyTracker<any>()
    tracker.setOriginal({ name: 'Carl' })
    tracker.mark('name', 'John')

    tracker.sync({ name: 'John' })
    expect(tracker.isDirty()).toBe(false)
    expect(tracker.getOriginals()).toEqual({ name: 'John' })
  })

  it('should handle nested objects (simple check)', () => {
    const tracker = new DirtyTracker<any>()
    const original = { settings: { theme: 'dark' } }
    tracker.setOriginal(original)

    tracker.mark('settings', { theme: 'light' })
    expect(tracker.isDirty()).toBe(true)
  })

  it('should reset state', () => {
    const tracker = new DirtyTracker<any>()
    tracker.mark('name', 'John')
    tracker.resetAll()
    expect(tracker.isDirty()).toBe(false)
  })

  it('should reset specific key', () => {
    const tracker = new DirtyTracker<any>()
    tracker.mark('name', 'John')
    tracker.mark('age', 31)
    tracker.reset('name')
    expect(tracker.isDirty('name')).toBe(false)
    expect(tracker.isDirty('age')).toBe(true)
  })
})
