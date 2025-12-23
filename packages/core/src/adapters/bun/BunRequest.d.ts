import type { GravitoRequest, ValidationTarget } from '../../http/types'
export declare class BunRequest implements GravitoRequest {
  readonly raw: Request
  private _url
  private _params
  private _query
  private _validated
  constructor(raw: Request, params?: Record<string, string>)
  setParams(params: Record<string, string>): void
  get url(): string
  get method(): string
  get path(): string
  param(name: string): string | undefined
  params(): Record<string, string>
  query(name: string): string | undefined
  queries(): Record<string, string | string[]>
  header(name: string): string | undefined
  header(): Record<string, string>
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
  arrayBuffer(): Promise<ArrayBuffer>
  parseBody<T = unknown>(): Promise<T>
  setValidated(target: ValidationTarget, data: unknown): void
  valid<T = unknown>(target: ValidationTarget): T
  private parseQuery
}
//# sourceMappingURL=BunRequest.d.ts.map
