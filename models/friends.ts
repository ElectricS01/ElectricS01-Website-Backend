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
  declare userId: number

  @ForeignKey(() => Users)
  @Column
  declare friendId: number

  @Column({
    allowNull: false,
    defaultValue: "pending"
  })
  declare status: string

  @BelongsTo(() => Users, "userId")
  declare user: Users

  @BelongsTo(() => Users, "friendId")
  declare user2: Users
}
