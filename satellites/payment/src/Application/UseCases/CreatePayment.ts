import { UseCase } from '@gravito/enterprise'
import type { IPaymentRepository } from '../../Domain/Contracts/IPaymentRepository'
import { Payment } from '../../Domain/Entities/Payment'

export interface CreatePaymentInput {
  name: string
}

export class CreatePayment extends UseCase<CreatePaymentInput, string> {
  constructor(private repository: IPaymentRepository) {
    super()
  }

  async execute(input: CreatePaymentInput): Promise<string> {
    const id = crypto.randomUUID()
    const entity = Payment.create(id, input.name)

    await this.repository.save(entity)

    return id
  }
}
