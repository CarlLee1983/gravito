/**
 * @gravito/atlas - 通用工具類型
 * @description 基礎枚舉類型與工具類型，無外部依賴
 */

/**
 * 支援的資料庫驅動類型
 */
export type DriverType = 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb' | 'redis'

/**
 * 支援的比較運算子
 */
export type Operator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'ilike'
  | 'not like'
  | 'in'
  | 'not in'
  | 'between'
  | 'not between'
  | 'is'
  | 'is not'

/**
 * WHERE 子句的布林運算子
 */
export type BooleanOperator = 'and' | 'or'

/**
 * 排序方向
 */
export type OrderDirection = 'asc' | 'desc'

/**
 * JOIN 類型
 */
export type JoinType = 'inner' | 'left' | 'right' | 'cross' | 'full'
