import { GravitoException } from './GravitoException'
export declare class ModelNotFoundException extends GravitoException {
  readonly model: string
  readonly id?: string | number
  constructor(model: string, id?: string | number)
}
//# sourceMappingURL=ModelNotFoundException.d.ts.map
