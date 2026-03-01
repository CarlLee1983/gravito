import type { Role } from '../../Domain/Entities/Role'

export interface RoleDTO {
  id: string
  name: string
  displayName: string
  description?: string
  isSystem: boolean
  permissionIds: string[]
  createdAt: string
  updatedAt?: string
}

export class RoleMapper {
  static toDTO(role: Role): RoleDTO {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      permissionIds: role.permissionIds,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt?.toISOString(),
    }
  }

  static toDTOList(roles: Role[]): RoleDTO[] {
    return roles.map((role) => this.toDTO(role))
  }
}
