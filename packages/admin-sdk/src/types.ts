/**
 * Gravito Admin SDK - Core Type Definitions
 */

export interface IPermission {
  id: string
  name: string
  description?: string
}

export interface IRole {
  id: string
  name: string
  permissions: string[] // Permission IDs
}

export interface IAdminUser {
  id: string
  username: string
  email: string
  roles: string[]
  permissions: string[] // Flattened permissions from roles
}

export type MenuNodeType = 'item' | 'group'

export interface IBaseMenuNode {
  id: string
  title: string
  icon?: string
  permission?: string
  sortOrder?: number
}

export interface IMenuItem extends IBaseMenuNode {
  type: 'item'
  path: string
}

export interface IMenuGroup extends IBaseMenuNode {
  type: 'group'
  children: (IMenuItem | IMenuGroup)[]
}

export type IMenuNode = IMenuItem | IMenuGroup

export interface IAdminModule {
  id: string
  title: string
  routes: Array<{
    path: string
    component: any // Framework specific
  }>
  menu?: IMenuNode[]
}

export interface IAuthResponse {
  token: string
  user: IAdminUser
}
