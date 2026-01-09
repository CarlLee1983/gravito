/**
 * Data Transfer Object for Member information
 */
export interface MemberDTO {
  id: string
  name: string
  email: string
  status: string
  level: string
  roles: string[]
  createdAt: string
  metadata?: Record<string, any>
}

/**
 * Mapper to convert Domain Entities to DTOs
 */
export class MemberMapper {
  /**
   * Convert a member entity to a serializable DTO
   */
  static toDTO(member: any): MemberDTO {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      status: member.status,
      level: member.level || 'standard',
      roles: member.roles || [],
      createdAt: member.createdAt.toISOString(),
      metadata: member.metadata,
    }
  }
}
