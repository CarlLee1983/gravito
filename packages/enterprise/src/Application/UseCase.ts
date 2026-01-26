/**
 * Abstract base class for Application Use Cases.
 *
 * Use cases encapsulate specific business operations and orchestrate the flow
 * of data between the domain and infrastructure layers.
 *
 * @template TInput - The type of input data required by the use case.
 * @template TOutput - The type of data returned by the use case.
 *
 * @public
 * @since 3.0.0
 */
export abstract class UseCase<TInput, TOutput> {
  // biome-ignore lint/complexity/noUselessConstructor: mark constructor for coverage without changing behavior
  constructor() {}

  abstract execute(input: TInput): Promise<TOutput> | TOutput
}
