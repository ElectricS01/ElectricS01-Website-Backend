import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "./users"

@Table
export default class Uploads extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  userId!: number

  @Column({
    allowNull: false
  })
  fileName!: string

  @Column({
    allowNull: false
  })
  name!: string

  @Column({
    allowNull: false
  })
  size!: number
}
