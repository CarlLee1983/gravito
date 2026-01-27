import { BigIntScalar } from './bigint'
import { DateTimeScalar } from './datetime'
import { EmailScalar } from './email'
import { JSONScalar } from './json'
import { URLScalar } from './url'
import { UUIDScalar } from './uuid'

export { BigIntScalar } from './bigint'
export { DateTimeScalar } from './datetime'
export { EmailScalar } from './email'
export { JSONScalar } from './json'
export { URLScalar } from './url'
export { UUIDScalar } from './uuid'

export const SCALAR_TYPE_DEFS = `
  """任意 JSON 值，可以是物件、陣列、字串、數字、布林值或 null"""
  scalar JSON

  """ISO 8601 格式的日期時間，如 2024-01-15T10:30:00.000Z"""
  scalar DateTime

  """大整數純量，用於處理超出 JavaScript Number 安全範圍的整數值。以字串形式傳輸以保持精度。"""
  scalar BigInt

  """符合 RFC 4122 標準的 UUID 格式字串。"""
  scalar UUID

  """符合標準網路電子郵件格式的字串。"""
  scalar Email

  """符合標準 URL 格式的字串。"""
  scalar URL
`

export const SCALAR_RESOLVERS = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,
  BigInt: BigIntScalar,
  UUID: UUIDScalar,
  Email: EmailScalar,
  URL: URLScalar,
}
