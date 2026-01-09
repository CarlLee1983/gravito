import { DB } from '@gravito/atlas'
import type { IMemberPasskeyRepository } from '../../Domain/Contracts/IMemberPasskeyRepository'
import { MemberPasskey } from '../../Domain/Entities/MemberPasskey'

export class AtlasMemberPasskeyRepository implements IMemberPasskeyRepository {
  private table = 'member_passkeys'

  async save(entity: MemberPasskey): Promise<void> {
    const record = entity.toRecord()
    const exists = await this.exists(entity.id)
    if (exists) {
      await DB.table(this.table).where('id', entity.id).update(record)
    } else {
      await DB.table(this.table).insert(record)
    }
  }

  async findById(id: string): Promise<MemberPasskey | null> {
    const row = await DB.table(this.table).where('id', id).first()
    return row ? this.map(row) : null
  }

  async findAll(): Promise<MemberPasskey[]> {
    const rows = await DB.table(this.table).get()
    return rows.map((row: any) => this.map(row))
  }

  async delete(id: string): Promise<void> {
    await DB.table(this.table).where('id', id).delete()
  }

  async exists(id: string): Promise<boolean> {
    const count = await DB.table(this.table).where('id', id).count()
    return count > 0
  }

  async findByMemberId(memberId: string): Promise<MemberPasskey[]> {
    const rows = await DB.table(this.table).where('member_id', memberId).get()
    return rows.map((row: any) => this.map(row))
  }

  async findByCredentialId(credentialId: string): Promise<MemberPasskey | null> {
    const row = await DB.table(this.table).where('credential_id', credentialId).first()
    return row ? this.map(row) : null
  }

  async deleteByCredentialId(credentialId: string): Promise<void> {
    await DB.table(this.table).where('credential_id', credentialId).delete()
  }

  private map(row: any): MemberPasskey {
    return MemberPasskey.reconstitute(row.id, {
      memberId: row.member_id,
      credentialId: row.credential_id,
      publicKey: row.public_key,
      counter: Number(row.counter ?? 0),
      transports: row.transports ? JSON.parse(row.transports) : undefined,
      displayName: row.display_name || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at),
    })
  }
}
