import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "./users"

@Table
export default class Scores extends Model {
  @ForeignKey(() => Users)
  @Column
  declare userId: number

  @Column
  declare gameId: number

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  declare difficulty: number

  @Column
  declare value: number
}
