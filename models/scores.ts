import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "./users"

@Table
export default class Scores extends Model {
  @ForeignKey(() => Users)
  @Column
  userId!: number

  @Column
  gameId!: number

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  difficulty!: number

  @Column
  value!: number
}
