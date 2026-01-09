import type { Repository } from '@gravito/enterprise'
import type { Payment } from '../Entities/Payment'

export interface IPaymentRepository extends Repository<Payment, string> {
  // Add custom methods here
}
