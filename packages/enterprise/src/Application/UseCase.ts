export abstract class UseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput> | TOutput
}
