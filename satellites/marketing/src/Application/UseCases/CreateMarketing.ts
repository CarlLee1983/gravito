import { UseCase } from '@gravito/enterprise'
import type { IMarketingRepository } from '../../Domain/Contracts/IMarketingRepository'
import { Marketing } from '../../Domain/Entities/Marketing'

export interface CreateMarketingInput {
  name: string
}

export class CreateMarketing extends UseCase<CreateMarketingInput, string> {
  constructor(private repository: IMarketingRepository) {
    super()
  }

  async execute(input: CreateMarketingInput): Promise<string> {
    const id = crypto.randomUUID()
    const entity = Marketing.create(id, input.name)

    await this.repository.save(entity)

    return id
  }
}
