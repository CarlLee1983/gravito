import { Column, Model, PrimaryKey } from '@gravito/atlas'

export class Product extends Model {
  @PrimaryKey()
  id!: number

  @Column()
  name!: string

  @Column()
  price!: number

  @Column()
  category?: string

  // 自動處理 timestamps (如果在遷移中有定義)
  @Column()
  createdAt!: Date
}
