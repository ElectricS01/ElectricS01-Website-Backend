import { Column, ForeignKey, Model, Table } from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Notifications extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  declare userId: number

  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  declare otherId: number

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  declare type: number

  @Column({
    allowNull: false,
    defaultValue: false
  })
  declare isRead: boolean
}
