import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Notifications extends Model {
  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  userId!: number

  @ForeignKey(() => Users)
  @Column({
    allowNull: false
  })
  otherId!: number

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  type!: number

  @Column({
    allowNull: false,
    defaultValue: false
  })
  isRead!: boolean
}
