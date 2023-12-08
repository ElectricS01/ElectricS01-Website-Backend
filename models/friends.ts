import { BelongsTo, Column, DataType, Model, Table } from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Friends extends Model {
  @Column
  userId!: number

  @Column
  friendId!: number

  @Column({
    allowNull: false,
    defaultValue: "pending",
    type: DataType.STRING
  })
  status!: string

  @BelongsTo(() => Users, "userId")
  user!: Users

  @BelongsTo(() => Users, "friendId")
  user2!: Users
}
