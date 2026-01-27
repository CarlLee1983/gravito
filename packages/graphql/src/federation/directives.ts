/**
 * Apollo Federation 2.0 指令定義
 */

import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'

/**
 * @key 指令
 * 定義實體的主鍵欄位，用於跨服務解析實體
 *
 * 範例：@key(fields: "id")
 */
export const keyDirective = new GraphQLDirective({
  name: 'key',
  description: '定義實體的主鍵欄位，用於 Federation 跨服務解析',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
  args: {
    fields: {
      type: new GraphQLNonNull(GraphQLString),
      description: '主鍵欄位選擇器（支援複合鍵，如 "id" 或 "id userId"）',
    },
    resolvable: {
      type: GraphQLBoolean,
      defaultValue: true,
      description: '此服務是否能夠解析此實體',
    },
  },
  isRepeatable: true,
})

/**
 * @shareable 指令
 * 標記欄位或類型可以在多個 subgraph 中定義
 *
 * 範例：@shareable
 */
export const shareableDirective = new GraphQLDirective({
  name: 'shareable',
  description: '標記欄位或類型可以在多個 subgraph 中定義',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.FIELD_DEFINITION],
})

/**
 * @external 指令
 * 標記欄位在其他 subgraph 中定義
 *
 * 範例：@external
 */
export const externalDirective = new GraphQLDirective({
  name: 'external',
  description: '標記欄位在其他 subgraph 中定義',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
})

/**
 * @requires 指令
 * 聲明欄位需要其他欄位的值才能解析
 *
 * 範例：@requires(fields: "price discount")
 */
export const requiresDirective = new GraphQLDirective({
  name: 'requires',
  description: '聲明欄位需要其他欄位的值才能解析',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    fields: {
      type: new GraphQLNonNull(GraphQLString),
      description: '所需的欄位選擇器',
    },
  },
})

/**
 * @provides 指令
 * 聲明此欄位提供某些欄位的值
 *
 * 範例：@provides(fields: "name")
 */
export const providesDirective = new GraphQLDirective({
  name: 'provides',
  description: '聲明此欄位提供某些欄位的值',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    fields: {
      type: new GraphQLNonNull(GraphQLString),
      description: '提供的欄位選擇器',
    },
  },
})

/**
 * 獲取所有 Federation 指令
 */
export function getFederationDirectives(): GraphQLDirective[] {
  return [keyDirective, shareableDirective, externalDirective, requiresDirective, providesDirective]
}

/**
 * 获取 Federation 指令的 SDL 定义
 */
export function getFederationDirectivesSDL(): string {
  return `
    scalar _FieldSet

    directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
    directive @shareable on FIELD_DEFINITION | OBJECT
    directive @external on FIELD_DEFINITION | OBJECT
    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
  `
}
