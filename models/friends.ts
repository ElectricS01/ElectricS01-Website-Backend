import { Table, Column, Model, DataType, BelongsTo } from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Friends extends Model {
  @Column
  userId!: number

  @Column
  friendId!: number

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: "pending"
  })
  status!: string

  @BelongsTo(() => Users, "userId")
  user!: Users

  @BelongsTo(() => Users, "friendId")
  user2!: Users
}
