import {
  Table,
  Column,
  Model,
  BelongsTo,
  DataType,
  AllowNull
} from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Friends extends Model {
  @Column
  userId!: number

  @Column
  friendId!: number

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    defaultValue: "pending"
  })
  status!: string

  @BelongsTo(() => Users, "userId")
  user!: Users

  @BelongsTo(() => Users, "friendId")
  user2!: Users
}
