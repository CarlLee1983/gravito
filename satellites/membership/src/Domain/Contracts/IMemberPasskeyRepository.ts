import type { Repository } from '@gravito/enterprise'
import type { MemberPasskey } from '../Entities/MemberPasskey'

export interface IMemberPasskeyRepository extends Repository<MemberPasskey, string> {
  findByMemberId(memberId: string): Promise<MemberPasskey[]>
  findByCredentialId(credentialId: string): Promise<MemberPasskey | null>
  deleteByCredentialId(credentialId: string): Promise<void>
}
