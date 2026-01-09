import { DB } from '@gravito/atlas'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import { Member } from '../../Domain/Entities/Member'

/**
 * Atlas Member Repository Implementation
 */
export class AtlasMemberRepository implements IMemberRepository {
  private table = 'members'

  async save(member: Member): Promise<void> {
    const data = {
      id: member.id,
      name: member.name,
      email: member.email,
      password_hash: member.passwordHash,
      status: member.status,
      roles: JSON.stringify(member.roles),
      verification_token: member.verificationToken || null,
      email_verified_at: member.emailVerifiedAt || null,
      password_reset_token: member.passwordResetToken || null,
      password_reset_expires_at: member.passwordResetExpiresAt || null,
      current_session_id: member.currentSessionId || null,
      remember_token: member.rememberToken || null,
      created_at: member.createdAt,
      metadata: JSON.stringify(member.metadata),
    }

    const exists = await this.exists(member.id)
    if (exists) {
      await DB.table(this.table).where('id', member.id).update(data)
    } else {
      await DB.table(this.table).insert(data)
    }
  }

  async findByEmail(email: string): Promise<Member | null> {
    const row = await DB.table(this.table).where('email', email).first()
    return row ? this.mapToDomain(row) : null
  }

  async findByVerificationToken(token: string): Promise<Member | null> {
    const row = await DB.table(this.table).where('verification_token', token).first()
    return row ? this.mapToDomain(row) : null
  }

  async findByResetToken(token: string): Promise<Member | null> {
    const row = await DB.table(this.table).where('password_reset_token', token).first()
    return row ? this.mapToDomain(row) : null
  }

  async findById(id: string): Promise<Member | null> {
    const row = await DB.table(this.table).where('id', id).first()
    return row ? this.mapToDomain(row) : null
  }

  async findAll(): Promise<Member[]> {
    const rows = await DB.table(this.table).get()
    return rows.map((row: any) => this.mapToDomain(row))
  }

  async delete(id: string): Promise<void> {
    await DB.table(this.table).where('id', id).delete()
  }

  async exists(id: string): Promise<boolean> {
    const count = await DB.table(this.table).where('id', id).count()
    return count > 0
  }

  private mapToDomain(row: any): Member {
    return Member.reconstitute(row.id, {
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      status: row.status,
      roles: row.roles ? JSON.parse(row.roles) : ['member'],
      verificationToken: row.verification_token,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : undefined,
      passwordResetToken: row.password_reset_token,
      passwordResetExpiresAt: row.password_reset_expires_at
        ? new Date(row.password_reset_expires_at)
        : undefined,
      currentSessionId: row.current_session_id,
      rememberToken: row.remember_token,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    })
  }
}
