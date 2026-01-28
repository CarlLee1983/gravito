import { describe, expect, it } from 'bun:test'
import { JoinManager } from '../src/query/clauses/JoinClause'

describe('JoinManager', () => {
  it('should be empty by default', () => {
    const manager = new JoinManager()
    expect(manager.getJoins()).toEqual([])
    expect(manager.hasJoins()).toBe(false)
    expect(manager.toSQL()).toBe('')
  })

  it('should add inner join', () => {
    const manager = new JoinManager()
    manager.add('inner', 'posts', 'users.id', '=', 'posts.user_id')
    expect(manager.getJoins()).toHaveLength(1)
    expect(manager.toSQL()).toBe('INNER JOIN "posts" ON "users.id" = "posts.user_id"')
  })

  it('should add left join', () => {
    const manager = new JoinManager()
    manager.left('profiles', 'users.id', '=', 'profiles.user_id')
    expect(manager.toSQL()).toBe('LEFT JOIN "profiles" ON "users.id" = "profiles.user_id"')
  })

  it('should add right join', () => {
    const manager = new JoinManager()
    manager.right('orders', 'users.id', '=', 'orders.user_id')
    expect(manager.toSQL()).toBe('RIGHT JOIN "orders" ON "users.id" = "orders.user_id"')
  })

  it('should add cross join', () => {
    const manager = new JoinManager()
    manager.cross('regions', 'users.region_id', '=', 'regions.id')
    expect(manager.toSQL()).toBe('CROSS JOIN "regions" ON "users.region_id" = "regions.id"')
  })

  it('should handle multiple joins', () => {
    const manager = new JoinManager()
    manager.left('profiles', 'users.id', '=', 'profiles.user_id')
    manager.add('inner', 'roles', 'users.role_id', '=', 'roles.id')
    expect(manager.toSQL()).toBe(
      'LEFT JOIN "profiles" ON "users.id" = "profiles.user_id" INNER JOIN "roles" ON "users.role_id" = "roles.id"'
    )
  })

  it('should reset state', () => {
    const manager = new JoinManager()
    manager.left('profiles', 'id', '=', 'user_id')
    manager.reset()
    expect(manager.hasJoins()).toBe(false)
    expect(manager.toSQL()).toBe('')
  })

  it('should clone correctly', () => {
    const manager = new JoinManager()
    manager.left('profiles', 'id', '=', 'user_id')
    const cloned = manager.clone()
    cloned.add('inner', 'roles', 'id', '=', 'role_id')
    expect(manager.getJoins()).toHaveLength(1)
    expect(cloned.getJoins()).toHaveLength(2)
  })
})
