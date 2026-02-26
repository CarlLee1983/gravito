/**
 * File System Router adapter for Astral static site generation
 */
import type { FileSystemRouter } from 'bun'

export interface AstralRouterConfig {
  dir: string
  origin: string
  assetPrefix?: string
  fileExtensions?: string[]
}

export class AstralFileSystemRouter {
  private router: FileSystemRouter

  constructor(config: AstralRouterConfig) {
    this.router = new Bun.FileSystemRouter({
      style: 'nextjs',
      dir: config.dir,
      origin: config.origin,
      assetPrefix: config.assetPrefix || '/',
      fileExtensions: config.fileExtensions || ['.ts', '.tsx', '.md'],
    })
  }

  /**
   * Match a pathname and return route metadata
   */
  match(pathname: string) {
    return this.router.match(pathname)
  }

  /**
   * Get all available routes
   */
  async getAllRoutes() {
    // Scanner would enumerate all files in configured directory
    const routes = []
    // Implementation details...
    return routes
  }

  /**
   * Reload routes (useful for dev server)
   */
  reload() {
    this.router.reload()
  }
}

// Usage example
export const createAstralRouter = (dir: string, origin: string) => {
  return new AstralFileSystemRouter({
    dir,
    origin,
    fileExtensions: ['.ts', '.tsx', '.md'],
  })
}
