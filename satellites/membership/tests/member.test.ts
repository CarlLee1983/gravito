import { describe, expect, it } from 'bun:test'
import { Member, MemberStatus } from '../src/Domain/Entities/Member'

describe('Member Domain Entity', () => {
  it('應該能正確建立新會員實體且預設狀態為 PENDING', () => {
    const member = Member.create('user-1', 'Carl', 'carl@example.com', 'hash-123')

    expect(member.id).toBe('user-1')
    expect(member.name).toBe('Carl')
    expect(member.email).toBe('carl@example.com')
    expect(member.status).toBe(MemberStatus.PENDING)
    expect(member.createdAt).toBeInstanceOf(Date)
  })

  it('執行 verifyEmail() 後狀態應該變更為 ACTIVE', () => {
    const member = Member.create('u1', 'N', 'e', 'h')

    member.verifyEmail()

    expect(member.status).toBe(MemberStatus.ACTIVE)
  })

  it('應該支援 metadata 的存取與擴充', () => {
    // 模擬從資料庫重建包含 metadata 的實體
    const member = Member.reconstitute('u1', {
      name: 'Carl',
      email: 'c',
      passwordHash: 'h',
      status: MemberStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        vat_number: '12345678',
        level: 'gold',
      },
    })

    expect(member.metadata.vat_number).toBe('12345678')
    expect(member.metadata.level).toBe('gold')
  })

  it('當無 metadata 時應該回傳空物件而非 undefined', () => {
    const member = Member.create('u1', 'N', 'e', 'h')
    expect(member.metadata).toBeDefined()
    expect(Object.keys(member.metadata).length).toBe(0)
  })
})
