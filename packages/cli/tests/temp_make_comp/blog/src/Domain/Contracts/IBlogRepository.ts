import type { Repository } from '@gravito/enterprise'
import type { Blog } from '../Aggregates/Blog'
import type { BlogId } from '../ValueObjects/BlogId'

export interface IBlogRepository extends Repository<Blog, BlogId> {
  // Add custom methods here
}
