import { type Container, ServiceProvider } from '@gravito/core'
import { CreateBlog } from './Application/UseCases/CreateBlog'
import { AtlasBlogRepository } from './Infrastructure/Persistence/AtlasBlogRepository'
import { BlogController } from './Interface/Http/Controllers/BlogController'

export class BlogServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 1. Bind Repository (Infrastructure)
    container.singleton('blog.repo', () => new AtlasBlogRepository())

    // 2. Bind UseCases (Application)
    container.singleton('blog.usecase.create', (c) => {
      return new CreateBlog(c.make('blog.repo'))
    })

    // 3. Bind Controllers (Interface)
    container.singleton('blog.controller', (c) => {
      return new BlogController(c.make('blog.usecase.create'))
    })
  }

  boot(): void {
    this.core?.logger.info('🛰️ Satellite Blog is operational')
  }
}
