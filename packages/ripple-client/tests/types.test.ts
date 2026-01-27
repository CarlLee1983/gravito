import { describe, expect, it } from 'bun:test'
import type { ChannelEventMap } from '../src/types'

// Module augmentation for testing
declare module '../src/types' {
  interface ChannelEventMap {
    news: {
      ArticlePublished: { title: string }
    }
  }
}

describe('ChannelEventMap Type Safety', () => {
  it('should allow defining typed events', () => {
    // This is mostly a compile-time check, but we can verify that the code runs.
    const event: ChannelEventMap['news']['ArticlePublished'] = { title: 'Test' }
    expect(event.title).toBe('Test')
  })
})
