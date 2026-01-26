import type { Span, Tracer } from './Tracer'

export class NoopSpan implements Span {
  setAttribute(): this {
    return this
  }
  setAttributes(): this {
    return this
  }
  addEvent(): this {
    return this
  }
  setStatus(): this {
    return this
  }
  end(): void {}
}

export class NoopTracer implements Tracer {
  startSpan(): Span {
    return new NoopSpan()
  }

  async withSpan<T>(_name: string, fn: (span: Span) => T | Promise<T>): Promise<T> {
    return fn(new NoopSpan())
  }
}
