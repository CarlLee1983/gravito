/**
 * File System Router adapter for Astral static site generation
 */
import type { FileSystemRouter, MatchedRoute } from 'bun'

export interface AstralRouterConfig {
  dir: string
  origin: string
  assetPrefix?: string
  fileExtensions?: string[]
}

export type RouteMatch = MatchedRoute

export interface StaticRouteMetadata {
  path: string
  filePath: string
  kind: 'static' | 'dynamic'
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
  match(pathname: string): RouteMatch | null {
    return this.router.match(pathname) as RouteMatch | null
  }

  /**
   * Get all available routes
   */
  async getAllRoutes(): Promise<string[]> {
    // Scanner would enumerate all files in configured directory
    const routes: string[] = []
    // Implementation details...
    return routes
  }

  /**
   * Reload routes (useful for dev server)
   */
  reload(): void {
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

export const createDevRouter = createAstralRouter
export const createProdRouter = createAstralRouter
