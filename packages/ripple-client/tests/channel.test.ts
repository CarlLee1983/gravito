import { describe, expect, it, mock } from 'bun:test'
import { Channel } from '../src/Channel'

// Module augmentation
declare module '../src/types' {
  interface ChannelEventMap {
    news: {
      ArticlePublished: { title: string }
    }
  }
}

describe('Channel', () => {
  it('should support typed events', () => {
    const sendMessage = mock()
    const channel = new Channel<'news'>('news', sendMessage)

    // Callback type inference check (compile time)
    const callback = mock((_data: { title: string }) => {})

    channel.listen('ArticlePublished', callback)

    channel._dispatch('ArticlePublished', { title: 'Hello' })
    expect(callback).toHaveBeenCalledWith({ title: 'Hello' })
  })

  it('should support untyped events', () => {
    const sendMessage = mock()
    const channel = new Channel('random', sendMessage)

    const callback = mock()
    channel.listen('something', callback)

    channel._dispatch('something', { foo: 'bar' })
    expect(callback).toHaveBeenCalledWith({ foo: 'bar' })
  })
})
