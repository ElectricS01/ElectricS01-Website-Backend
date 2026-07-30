import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "./users"

@Table
export default class Uploads extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  declare userId: number

  @Column({
    allowNull: false
  })
  declare fileName: string

  @Column({
    allowNull: false
  })
  declare name: string

  @Column({
    allowNull: false
  })
  declare size: number
}
