import { describe, expect, it } from 'bun:test'
import { Blog } from '../src/Domain/Aggregates/Blog'
import { BlogId } from '../src/Domain/ValueObjects/BlogId'

describe('Blog Aggregate', () => {
  it('should create a new aggregate with a domain event', () => {
    const id = BlogId.create()
    const aggregate = Blog.create(id, 'Test Name')

    expect(aggregate.id).toBe(id)
    expect(aggregate.name).toBe('Test Name')
    expect(aggregate.pullDomainEvents()).toHaveLength(1)
  })
})
