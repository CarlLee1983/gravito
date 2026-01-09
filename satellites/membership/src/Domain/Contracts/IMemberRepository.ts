import type { Repository } from '@gravito/enterprise'
import type { Member } from '../Entities/Member'

/**
 * Member Repository Contract
 */
export interface IMemberRepository extends Repository<Member, string> {
  findByEmail(email: string): Promise<Member | null>
  findByVerificationToken(token: string): Promise<Member | null>
  findByResetToken(token: string): Promise<Member | null>
}
