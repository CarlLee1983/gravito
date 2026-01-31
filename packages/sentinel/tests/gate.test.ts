import { describe, expect, it, mock } from 'bun:test'
import { AuthorizationException } from '@gravito/core'
import { Gate } from '../src/Gate'

describe('Gate Coverage', () => {
  it('defines and checks abilities', async () => {
    const gate = new Gate()
    gate.define('edit-post', (user: any, post: any) => user.id === post.userId)

    const user = { id: 1 }
    const post = { userId: 1 }
    const otherPost = { userId: 2 }

    expect(await gate.forUser(async () => user as any).allows('edit-post', post)).toBe(true)
    expect(await gate.forUser(async () => user as any).denies('edit-post', otherPost)).toBe(true)
  })

  it('handles guest users', async () => {
    const gate = new Gate()
    gate.define('view-public', () => true)

    expect(await gate.allows('view-public')).toBe(true)
  })

  it('throws exception on authorize() failure', async () => {
    const gate = new Gate()
    gate.define('admin', () => false)

    try {
      await gate.authorize('admin')
      expect().fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthorizationException)
    }
  })

  it('allows everything for super admin via before() callback', async () => {
    const gate = new Gate()
    gate.before((user: any) => {
      if (user.isAdmin) {
        return true
      }
    })
    gate.define('some-ability', () => false)

    const admin = { isAdmin: true }
    expect(await gate.forUser(async () => admin as any).allows('some-ability')).toBe(true)
  })

  it('denies everything via before() callback', async () => {
    const gate = new Gate()
    gate.before(() => false)
    gate.define('some-ability', () => true)

    expect(await gate.allows('some-ability')).toBe(false)
  })

  it('denies undefined abilities', async () => {
    const gate = new Gate()
    expect(await gate.allows('undefined')).toBe(false)
  })

  it('supports policies', async () => {
    class Post {}
    const gate = new Gate()
    gate.policy(Post, {
      update: (user: any, post: any) => user.id === post.userId,
    })

    const user = { id: 1 }
    const post = new Post()
    // @ts-expect-error
    post.userId = 1

    expect(await gate.forUser(async () => user as any).allows('update', post)).toBe(true)
  })

  it('runs after callbacks', async () => {
    const gate = new Gate()
    const after = mock(() => true)
    gate.after(after)
    gate.define('test', () => false)

    expect(await gate.allows('test')).toBe(true)
    expect(after).toHaveBeenCalled()
  })
})
