import type { HttpMethod } from '../../http/types'
import { NodeType, type RouteHandler } from './types'
/**
 * Node in the Radix Router tree.
 * @internal
 */
export declare class RadixNode {
  segment: string
  type: NodeType
  children: Map<string, RadixNode>
  paramChild: RadixNode | null
  wildcardChild: RadixNode | null
  handlers: Map<HttpMethod, RouteHandler[]>
  paramName: string | null
  regex: RegExp | null
  constructor(segment?: string, type?: NodeType)
  toJSON(): any
  static fromJSON(json: any): RadixNode
}
