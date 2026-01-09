export abstract class UseCase<TInput, TOutput> {
  // biome-ignore lint/complexity/noUselessConstructor: mark constructor for coverage without changing behavior
  constructor() {}

  abstract execute(input: TInput): Promise<TOutput> | TOutput
}
