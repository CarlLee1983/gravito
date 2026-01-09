/**
 * Gravito 核心 Context 抽象介面
 * 用於解耦核心引擎與具體單體/微服務插件
 */
export interface GravitoContext {
  req: any
  res: any
  json(data: any, status?: number): Response
  text(text: string, status?: number): Response
  redirect(url: string, status?: number): Response
  get<T>(key: string): T
  set<T>(key: string, value: T): void
}
