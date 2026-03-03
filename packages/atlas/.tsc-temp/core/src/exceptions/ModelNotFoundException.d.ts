import { GravitoException } from './GravitoException'
/**
 * Exception thrown when a database model is not found.
 * @public
 */
export declare class ModelNotFoundException extends GravitoException {
  readonly model: string
  readonly id?: string | number
  constructor(model: string, id?: string | number)
}
