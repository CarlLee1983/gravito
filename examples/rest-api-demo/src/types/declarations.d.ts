declare module '@gravito/core/compat' {
  import type {
    ContentfulStatusCode,
    GravitoContext,
    GravitoHandler,
    GravitoMiddleware,
    GravitoNext,
    GravitoRequest,
    HttpMethod,
    StatusCode,
  } from '@gravito/core'

  export type Context = GravitoContext
  export type MiddlewareHandler = GravitoMiddleware
  export type Handler = GravitoHandler
  export type Next = GravitoNext
  export type {
    ContentfulStatusCode,
    GravitoContext,
    GravitoHandler,
    GravitoMiddleware,
    GravitoNext,
    GravitoRequest,
    HttpMethod,
    StatusCode,
  }
}

declare module 'bcrypt' {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>
  export function compare(data: string, encrypted: string): Promise<boolean>
  export function genSalt(rounds?: number): Promise<string>
  export function genSaltSync(rounds?: number): string
  export function hashSync(data: string, saltOrRounds: string | number): string
  export function compareSync(data: string, encrypted: string): boolean
  export function getRounds(encrypted: string): number
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    algorithm?: string
    expiresIn?: string | number
    notBefore?: string | number
    audience?: string | string[]
    subject?: string
    issuer?: string
    jwtid?: string
    [key: string]: unknown
  }

  export interface VerifyOptions {
    algorithms?: string[]
    audience?: string | string[]
    issuer?: string | string[]
    subject?: string
    [key: string]: unknown
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): object | string

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): null | { [key: string]: unknown } | string
}
