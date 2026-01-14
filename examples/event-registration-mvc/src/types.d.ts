import { GravitoContext, GravitoVariables } from '@gravito/core'
import { AuthManager, HashManager } from '@gravito/sentinel'
import { SessionService } from '@gravito/pulsar'

declare module '@gravito/core' {
  interface GravitoContext {
    inertia?: any
    session?: any
    auth?: any
    params?: any
    query?: any
    body?: any
    back?(): any
    redirect(url: string, status?: number): any
    app?: any
  }
}

declare global {
  interface ImportMeta {
    readonly glob: any
  }
}
