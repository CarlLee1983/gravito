import { describe, expect, it } from 'bun:test'
import { Gate } from '../src/Gate'

describe('Gate Policy Discovery', () => {
  it('discovers policies with static model property', async () => {
    class Post {}
    class PostPolicy {
      static model = Post
      update() {
        return true
      }
    }

    const gate = new Gate()
    gate.discover([PostPolicy])

    const allowed = await gate.allows('update', new Post())
    expect(allowed).toBe(true)
  })

  it('can discover policies from an object map', async () => {
    class User {}
    class UserPolicy {
      static model = User
      delete() {
        return true
      }
    }

    const modules = { UserPolicy }
    const gate = new Gate()
    gate.discover(modules)

    const allowed = await gate.allows('delete', new User())
    expect(allowed).toBe(true)
  })

  it('uses policy guessers to resolve policies', async () => {
    class Comment {}
    class CommentPolicy {
      view() {
        return true
      }
    }

    const gate = new Gate()

    // Register a guesser
    gate.guessPolicyUsing((model) => {
      if (model === Comment) {
        return CommentPolicy
      }
      return null
    })

    const allowed = await gate.allows('view', new Comment())
    expect(allowed).toBe(true)
  })

  it('guesses policy and caches it', async () => {
    class Tag {}
    class TagPolicy {
      edit() {
        return true
      }
    }

    let guessCount = 0
    const gate = new Gate()

    gate.guessPolicyUsing((model) => {
      guessCount++
      if (model === Tag) {
        return TagPolicy
      }
      return null
    })

    await gate.allows('edit', new Tag())
    await gate.allows('edit', new Tag())

    expect(guessCount).toBe(1) // Should cache after first guess
  })
})
