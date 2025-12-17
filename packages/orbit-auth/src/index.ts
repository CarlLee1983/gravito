import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import type { Context, Next } from 'hono';
import { sign, verify } from 'hono/jwt';

export interface OrbitAuthOptions {
  secret: string;
  exposeAs?: string; // Default: 'auth'
  guard?: 'jwt' | 'session' | 'auto';
  sessionKey?: string; // Default: 'session' (ctx.get)
  sessionUserKey?: string; // Default: 'auth.userId'
  regenerateSessionOnLogin?: boolean; // Default: true
}

export type AuthPayload = {
  sub: string;
  role?: string;
  [key: string]: unknown;
};

export class OrbitAuth implements GravitoOrbit {
  constructor(private options?: OrbitAuthOptions) {}

  install(core: PlanetCore): void {
    const config = this.options || core.config.get('auth');

    if (!config || !config.secret) {
      throw new Error(
        '[OrbitAuth] Secret is required. Please provide options or set "auth.secret" in core config.'
      );
    }

    const {
      secret,
      exposeAs = 'auth',
      guard = 'jwt',
      sessionKey = 'session',
      sessionUserKey = 'auth.userId',
      regenerateSessionOnLogin = true,
    } = config;
    const logger = core.logger;

    logger.info(`[OrbitAuth] Initializing Auth (Exposed as: ${exposeAs})`);

    // Helper Methods
    const jwt = {
      async sign(payload: AuthPayload): Promise<string> {
        // Hook: Allow plugins to modify payload before signing
        const finalPayload = await core.hooks.applyFilters('auth:payload', payload);
        return sign(finalPayload, secret);
      },

      async verify(token: string): Promise<AuthPayload> {
        return (await verify(token, secret)) as AuthPayload;
      },
    };

    // Fire init once for observability (do not bind to request context)
    core.hooks.doAction('auth:init', jwt);

    // Inject helper into context (request-aware)
    core.app.use('*', async (c: Context, next: Next) => {
      const session =
        guard === 'session' || guard === 'auto' ? (c.get(sessionKey as any) as any) : null;

      const authService = {
        ...jwt,
        guard,
        check: () => {
          if (!session) return false;
          return session.has(sessionUserKey);
        },
        id: () => {
          if (!session) return null;
          return session.get(sessionUserKey, null) as string | null;
        },
        login: (userId: string) => {
          if (!session) {
            throw new Error(
              '[OrbitAuth] Session guard is enabled but no session was found in context.'
            );
          }
          if (regenerateSessionOnLogin) session.regenerate();
          session.put(sessionUserKey, userId);
        },
        logout: () => {
          if (!session) return;
          session.forget(sessionUserKey);
          session.regenerate();
        },
      };

      c.set(exposeAs, authService);
      await next();
    });
  }
}

export default function orbitAuth(core: PlanetCore, options: OrbitAuthOptions) {
  const {
    secret,
    exposeAs = 'auth',
    guard = 'jwt',
    sessionKey = 'session',
    sessionUserKey = 'auth.userId',
    regenerateSessionOnLogin = true,
  } = options;
  const logger = core.logger;

  logger.info(`[OrbitAuth] Initializing Auth (Exposed as: ${exposeAs})`);

  // Helper Methods
  const jwt = {
    async sign(payload: AuthPayload): Promise<string> {
      const finalPayload = await core.hooks.applyFilters('auth:payload', payload);
      return sign(finalPayload, secret);
    },
    async verify(token: string): Promise<AuthPayload> {
      return (await verify(token, secret)) as AuthPayload;
    },
  };

  core.hooks.doAction('auth:init', jwt);

  // Inject helper into context (request-aware)
  core.app.use('*', async (c: Context, next: Next) => {
    const session =
      guard === 'session' || guard === 'auto' ? (c.get(sessionKey as any) as any) : null;

    const authService = {
      ...jwt,
      guard,
      check: () => {
        if (!session) return false;
        return session.has(sessionUserKey);
      },
      id: () => {
        if (!session) return null;
        return session.get(sessionUserKey, null) as string | null;
      },
      login: (userId: string) => {
        if (!session) {
          throw new Error(
            '[OrbitAuth] Session guard is enabled but no session was found in context.'
          );
        }
        if (regenerateSessionOnLogin) session.regenerate();
        session.put(sessionUserKey, userId);
      },
      logout: () => {
        if (!session) return;
        session.forget(sessionUserKey);
        session.regenerate();
      },
    };

    c.set(exposeAs, authService);
    await next();
  });

  return jwt;
}
