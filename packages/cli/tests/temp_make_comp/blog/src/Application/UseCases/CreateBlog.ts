import { UseCase } from '@gravito/enterprise'
import { Blog } from '../../Domain/Aggregates/Blog'
import type { IBlogRepository } from '../../Domain/Contracts/IBlogRepository'
import { BlogId } from '../../Domain/ValueObjects/BlogId'

export interface CreateBlogInput {
  name: string
}

export class CreateBlog extends UseCase<CreateBlogInput, string> {
  constructor(private repository: IBlogRepository) {
    super()
  }

  async execute(input: CreateBlogInput): Promise<string> {
    const id = BlogId.create()
    const entity = Blog.create(id, input.name)

    await this.repository.save(entity)

    return id.value
  }
}
