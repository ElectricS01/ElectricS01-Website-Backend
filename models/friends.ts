import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table
} from "sequelize-typescript"
import Users from "../models/users"

@Table
export default class Friends extends Model {
  @ForeignKey(() => Users)
  @Column
  userId!: number

  @ForeignKey(() => Users)
  @Column
  friendId!: number

  @Column({
    allowNull: false,
    defaultValue: "pending"
  })
  status!: string

  @BelongsTo(() => Users, "userId")
  user!: Users

  @BelongsTo(() => Users, "friendId")
  user2!: Users
}
