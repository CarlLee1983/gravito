/**
 * Gravito Admin SDK - Core Type Definitions
 */

/**
 * Represents a granular administrative permission.
 *
 * @public
 * @since 3.0.0
 */
export interface IPermission {
  /** Unique permission identifier (e.g., 'users.create'). */
  id: string
  /** Human-readable name of the permission. */
  name: string
  /** Optional detailed description of what this permission allows. */
  description?: string
}

/**
 * Represents a role that groups multiple permissions together.
 *
 * @public
 * @since 3.0.0
 */
export interface IRole {
  /** Unique role identifier (e.g., 'editor'). */
  id: string
  /** Human-readable name of the role. */
  name: string
  /** Array of Permission IDs assigned to this role. */
  permissions: string[]
}

/**
 * Represents a user with access to the Gravito Admin environment.
 *
 * @public
 * @since 3.0.0
 */
export interface IAdminUser {
  /** Unique user identifier. */
  id: string
  /** Display name/identifier for login. */
  username: string
  /** Primary contact email address. */
  email: string
  /** Array of Role IDs assigned to the user. */
  roles: string[]
  /** Array of all Permission IDs (direct and inherited from roles). */
  permissions: string[]
}

/**
 * Base properties for all nodes in the admin navigation menu.
 *
 * @public
 * @since 3.0.0
 */
export interface IBaseMenuNode {
  /** Unique identifier for the menu node. */
  id: string
  /** Display title in the sidebar. */
  title: string
  /** Optional icon identifier (e.g., Lucide icon name). */
  icon?: string
  /** Optional permission ID required to view this menu node. */
  permission?: string
  /** Priority for sorting items in the sidebar (lower is higher). */
  sortOrder?: number
}

/**
 * A clickable navigation item in the admin menu.
 *
 * @public
 * @since 3.0.0
 */
export interface IMenuItem extends IBaseMenuNode {
  /** Identifies this node as a single item. */
  type: 'item'
  /** The frontend route path to navigate to. */
  path: string
}

/**
 * A group node that can contain child items or other groups.
 *
 * @public
 * @since 3.0.0
 */
export interface IMenuGroup extends IBaseMenuNode {
  /** Identifies this node as a group. */
  type: 'group'
  /** Nested menu items or subgroups. */
  children: (IMenuItem | IMenuGroup)[]
}

/**
 * Combined type for any menu hierarchy node.
 *
 * @public
 * @since 3.0.0
 */
export type IMenuNode = IMenuItem | IMenuGroup

/**
 * Defines a dynamic module integrated into the Admin Shell.
 *
 * Modules can contribute their own routes and sidebar items.
 *
 * @public
 * @since 3.0.0
 */
export interface IAdminModule {
  /** Unique module identifier. */
  id: string
  /** Display name for the module. */
  title: string
  /** Array of React/Vue routes contributed by this module. */
  routes: Array<{
    /** URL path relative to the module root. */
    path: string
    /** The component to render for this route. */
    component: any
  }>
  /** Optional sidebar navigation nodes contributed by this module. */
  menu?: IMenuNode[]
}

/**
 * Standard payload returned by successful admin authentication.
 *
 * @public
 * @since 3.0.0
 */
export interface IAuthResponse {
  /** Bearer/Access token for subsequent API calls. */
  token: string
  /** The authenticated admin user metadata. */
  user: IAdminUser
}
