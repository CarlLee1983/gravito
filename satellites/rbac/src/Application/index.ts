// UseCases

export { type PermissionDTO, PermissionMapper } from './DTOs/PermissionDTO'
// DTOs
export { type RoleDTO, RoleMapper } from './DTOs/RoleDTO'
// Errors
export { RbacError, type RbacErrorCode, RbacErrorFactory } from './Errors/RbacError'
// Registry
export { PermissionRegistry } from './Registry/PermissionRegistry'
export { AssignRoleToAdminUseCase } from './UseCases/AssignRoleToAdmin'
export { type AdminForPermissionCheck, CheckPermissionUseCase } from './UseCases/CheckPermission'
export { CreateRoleUseCase, type RequestingAdmin } from './UseCases/CreateRole'
export { DeleteRoleUseCase } from './UseCases/DeleteRole'
export { GetRoleUseCase } from './UseCases/GetRole'
export { ListPermissionsUseCase } from './UseCases/ListPermissions'
export { ListRolesUseCase } from './UseCases/ListRoles'
export { RevokeRoleFromAdminUseCase } from './UseCases/RevokeRoleFromAdmin'
export { SyncRolePermissionsUseCase } from './UseCases/SyncRolePermissions'
export { UpdateRoleUseCase } from './UseCases/UpdateRole'
