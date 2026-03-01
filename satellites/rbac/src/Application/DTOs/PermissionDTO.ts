import type { Permission } from '../../Domain/Entities/Permission'

export interface PermissionDTO {
  id: string
  key: string
  groupName: string
  action: string
  field?: string
  label: string
  description?: string
  isSystem: boolean
  createdAt: string
}

export class PermissionMapper {
  static toDTO(permission: Permission): PermissionDTO {
    return {
      id: permission.id,
      key: permission.key.value,
      groupName: permission.groupName,
      action: permission.action,
      field: permission.field,
      label: permission.label,
      description: permission.description,
      isSystem: permission.isSystem,
      createdAt: permission.createdAt.toISOString(),
    }
  }

  static toDTOList(permissions: Permission[]): PermissionDTO[] {
    return permissions.map((permission) => this.toDTO(permission))
  }
}
