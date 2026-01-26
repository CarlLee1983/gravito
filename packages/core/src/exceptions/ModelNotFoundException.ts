import { GravitoException } from './GravitoException'

/**
 * Exception thrown when a database model is not found.
 * @public
 */
export class ModelNotFoundException extends GravitoException {
  public readonly model: string
  public readonly id?: string | number

  constructor(model: string, id?: string | number) {
    super(404, 'NOT_FOUND', {
      message: `${model} not found.`,
      i18nKey: 'errors.model.not_found',
      i18nParams: { model, id: String(id ?? '') },
    })
    this.model = model
    if (id !== undefined) {
      this.id = id
    }
  }
}
