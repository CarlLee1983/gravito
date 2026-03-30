import type { HttpMethod } from '../../http/types'
import { NodeType, type RouteHandler } from './types'

/**
 * Node in the Radix Router tree.
 * @internal
 */
export class RadixNode {
  // Path segment for this node (e.g., "users", ":id")
  public segment: string

  // Node type (Static, Param, Wildcard)
  public type: NodeType

  // Children nodes (mapped by segment for fast lookup)
  public children: Map<string, RadixNode> = new Map()

  // Specialized child for parameter node (only one per level allowed usually to avoid ambiguity, though some routers support multiple)
  public paramChild: RadixNode | null = null

  // Specialized child for wildcard node
  public wildcardChild: RadixNode | null = null

  // Handlers registered at this node (keyed by HTTP method)
  public handlers: Map<HttpMethod, RouteHandler[]> = new Map()

  // Parameter name if this is a PARAM node (e.g., "id" for ":id")
  public paramName: string | null = null

  // Parameter constraints (regex) - only applicable if this is a PARAM node
  // If we support per-route constraints, they might need to be stored differently,
  // but for now assume constraints are defined at node level (uncommon) or checked at match time.
  // Laravel allows global pattern constraints or per-route.
  // Ideally, constraints should be stored with the handler or part of matching logic.
  // For a Radix tree, if we have constraints, we might need to backtrack if constraint fails?
  // Or simply store constraint with the param node.
  public regex: RegExp | null = null

  constructor(segment = '', type: NodeType = NodeType.STATIC) {
    this.segment = segment
    this.type = type
  }

  toJSON(): Record<string, unknown> {
    return {
      segment: this.segment,
      type: this.type,
      children: Array.from(this.children.entries()).map(([k, v]) => [k, v.toJSON()]),
      paramChild: this.paramChild?.toJSON() || null,
      wildcardChild: this.wildcardChild?.toJSON() || null,
      paramName: this.paramName,
      regex: this.regex ? this.regex.source : null,
    }
  }

  static fromJSON(json: Record<string, unknown>): RadixNode {
    const node = new RadixNode(json.segment as string | undefined, json.type as NodeType | undefined)
    node.paramName = (json.paramName as string | null) ?? null
    if (json.regex) {
      node.regex = new RegExp(json.regex as string)
    }
    if (json.children) {
      for (const [key, childJson] of json.children as [string, Record<string, unknown>][]) {
        node.children.set(key, RadixNode.fromJSON(childJson))
      }
    }
    if (json.paramChild) {
      node.paramChild = RadixNode.fromJSON(json.paramChild as Record<string, unknown>)
    }
    if (json.wildcardChild) {
      node.wildcardChild = RadixNode.fromJSON(json.wildcardChild as Record<string, unknown>)
    }
    return node
  }
}
