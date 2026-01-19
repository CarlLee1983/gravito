export class Mutex {
  private queue: Promise<any> = Promise.resolve()

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn())
    this.queue = next.then(
      () => {},
      () => {}
    )
    return next
  }
}
